-- ESTLIM · o banco passa a pensar no horario de Brasilia
--
-- O Postgres do Supabase roda em UTC, e todas as funcoes usavam current_date e
-- localtime. Duas consequencias, as duas confirmadas no proprio banco:
--
--   1. Hora errada. Uma despesa no credito lancada as 11h30 daqui nascia paga
--      as 14h30. Os registros antigos escaparam porque vieram pelo app, que
--      manda o relogio do aparelho; o estrago era so no que o banco grava
--      sozinho.
--   2. Data errada entre 21h e meia-noite. Nessa janela o banco ja acha que e
--      o dia seguinte, o que erra o status de atrasado, o aviso de vencimento
--      e o ciclo da fatura.
--
-- A correcao nao e mudar a configuracao da sessao, que depende de quem abriu a
-- conexao: sao duas funcoes explicitas, que valem igual para o cron, para o
-- PostgREST e para quem abrir o SQL Editor.
--
-- O cron tambem estava torto. Ele agenda em UTC, e a virada de mes rodava as
-- 00:10 UTC do dia 1, que e 21:10 do dia 30 ou 31 aqui: ela acontecia antes de
-- o mes virar.

-- ============================================================
-- 1. A UNICA FONTE DE "AGORA"
-- ============================================================
create or replace function private.fn_hoje()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create or replace function private.fn_agora_hora()
returns time language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::time
$$;

grant execute on function private.fn_hoje() to authenticated, service_role;
grant execute on function private.fn_agora_hora() to authenticated, service_role;

-- ============================================================
-- 2. AS QUE SO LEEM A DATA
-- ============================================================
create or replace function private.fn_marcar_atrasados()
returns int language plpgsql security definer set search_path = public as $$
declare v_qtd int;
begin
  update lancamentos
     set status = 'atrasado'
   where status = 'pendente'
     and tipo = 'despesa'
     and data_vencimento < private.fn_hoje();
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;
revoke all on function private.fn_marcar_atrasados() from public, anon, authenticated;

create or replace function private.fn_status_do_pagamento()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update lancamentos set status = 'pago' where id = new.lancamento_id;
  elsif TG_OP = 'DELETE' then
    update lancamentos
       set status = case
         when tipo <> 'despesa' then 'pendente'::status_tipo
         when data_vencimento < private.fn_hoje() then 'atrasado'::status_tipo
         else 'pendente'::status_tipo
       end
     where id = old.lancamento_id;
  end if;
  return null;
end $$;

create or replace function private.fn_criar_fatura()
returns trigger language plpgsql set search_path = public as $$
declare
  v_conta uuid;
  v_categoria uuid;
begin
  if new.tipo <> 'cartao' then return new; end if;

  select id into v_conta from carteiras
   where casal_id = new.casal_id and tipo = 'conta' and dono = new.dono and ativo
   order by criado_em limit 1;

  select id into v_categoria from categorias
   where casal_id = new.casal_id
     and nome = case when new.dono = 'RLiima' then 'Empresa RLiima' else 'Dívidas e parcelas' end;

  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_vencimento, categoria_id, forma_metodo, forma_ref, dono, cartao_id, criado_por
  ) values (
    new.casal_id, 'despesa', 'Fatura ' || new.nome, new.nome, 'fixa', 'variavel',
    null,
    private.fn_data_no_mes(
      extract(year from private.fn_hoje())::int,
      extract(month from private.fn_hoje())::int,
      coalesce(new.dia_vencimento, 10)
    ),
    v_categoria, 'debito', v_conta::text, new.dono, new.id, auth.uid()
  );

  return new;
end $$;

-- ============================================================
-- 3. A QUE GRAVA A BAIXA DO CREDITO
-- ============================================================
create or replace function private.fn_baixa_no_credito()
returns trigger language plpgsql set search_path = public as $$
declare
  v_credito boolean := (
    new.tipo = 'despesa'
    and new.forma_metodo = 'credito'
    and new.cartao_id is null
    and new.forma_ref is not null
    and coalesce(new.valor_previsto, 0) > 0
  );
  v_baixa pagamentos%rowtype;
begin
  select * into v_baixa from pagamentos where lancamento_id = new.id;

  if v_credito and v_baixa.id is null then
    insert into pagamentos (
      lancamento_id, data_pagamento, hora_pagamento, valor_pago,
      forma_metodo, forma_ref, confirmado_por
    ) values (
      new.id, coalesce(new.data_emissao, private.fn_hoje()), private.fn_agora_hora(),
      new.valor_previsto, 'credito', new.forma_ref,
      coalesce(auth.uid(), new.criado_por)
    );
    return null;
  end if;

  if v_credito and v_baixa.forma_metodo = 'credito'
     and (v_baixa.valor_pago is distinct from new.valor_previsto
          or v_baixa.forma_ref is distinct from new.forma_ref) then
    update pagamentos
       set valor_pago = new.valor_previsto, forma_ref = new.forma_ref
     where lancamento_id = new.id;
    return null;
  end if;

  if not v_credito and v_baixa.forma_metodo = 'credito' then
    delete from pagamentos where lancamento_id = new.id;
  end if;

  return null;
end $$;

-- ============================================================
-- 4. AS RPC QUE O APP CHAMA
-- ============================================================
-- fn_criar_ajuste e fn_criar_lancamentos foram reescritas com private.fn_hoje()
-- e private.fn_agora_hora() no lugar de current_date e localtime. O corpo delas
-- e o mesmo da 0020, sem outra mudanca. Estao no banco pela migration
-- 0023b_relogio_de_brasilia_nas_rpc, aplicada junto desta.

-- ============================================================
-- 5. OS AVISOS E A VIRADA
-- ============================================================
create or replace function private.fn_virada_mes(p_referencia date default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_ref date := coalesce(p_referencia, private.fn_hoje());
  v_inicio date := date_trunc('month', v_ref)::date;
  v_anterior date := (v_inicio - interval '1 month')::date;
  v_fim_anterior date := (v_inicio - interval '1 day')::date;
  v_qtd int;
begin
  -- Antes de replicar, a fatura que fecha guarda quanto ela era.
  update lancamentos l
     set valor_previsto = c.usado
    from carteiras c
   where c.id = l.cartao_id
     and l.status <> 'pago'
     and l.data_vencimento between v_anterior and v_fim_anterior
     and c.usado > 0;

  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
    dono, cartao_id, investimento_id, criado_por
  )
  select
    a.casal_id, a.tipo, a.descricao, a.pagar_a, a.natureza, a.tipo_valor,
    case when a.tipo_valor = 'variavel' then null else a.valor_previsto end,
    null,
    private.fn_data_no_mes(
      extract(year from v_inicio)::int,
      extract(month from v_inicio)::int,
      extract(day from a.data_vencimento)::int
    ),
    'pendente', a.categoria_id, a.forma_metodo, a.forma_ref,
    a.dono, a.cartao_id, a.investimento_id, a.criado_por
  from lancamentos a
  where a.natureza = 'fixa'
    and a.data_vencimento between v_anterior and v_fim_anterior
    and not exists (
      select 1 from lancamentos b
       where b.casal_id = a.casal_id
         and b.descricao = a.descricao
         and b.dono = a.dono
         and b.data_vencimento >= v_inicio
         and b.data_vencimento < (v_inicio + interval '1 month')
    );

  get diagnostics v_qtd = row_count;
  perform private.fn_marcar_atrasados();
  return v_qtd;
end $$;
revoke all on function private.fn_virada_mes(date) from public, anon, authenticated;

-- fn_avisos_para_push tambem passou a usar private.fn_hoje(), mantendo o resto
-- igual ao da 0021 mais o formatador de moeda da 0022.

-- ============================================================
-- 6. O CRON, ESCRITO PELO QUE VALE AQUI
-- ============================================================
-- O pg_cron agenda em UTC. Os horarios ficam assim:
--   virada de mes: 03:10 UTC do dia 1 = 00:10 daqui. Antes era 00:10 UTC, que
--     e 21:10 do dia 30 ou 31, ou seja, antes de o mes virar.
--   atrasados:     03:00 UTC = 00:00 daqui
--   push do dia:   12:00 UTC = 09:00 daqui
select cron.unschedule('estlim-virada-de-mes');
select cron.schedule('estlim-virada-de-mes', '10 3 1 * *', $cron$ select private.fn_virada_mes(); $cron$);
