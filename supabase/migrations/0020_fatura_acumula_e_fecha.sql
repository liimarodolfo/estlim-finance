-- ESTLIM · a fatura acumula sozinha e fecha com confirmacao
--
-- O QUE FALTAVA NA 0019
-- A 0019 resolveu a fatura JA FECHADA: o valor digitado a mao menos o que foi
-- lancado em detalhe. Mas durante o ciclo aberto o Rodolfo ainda nao sabe o
-- valor fechado, e a fatura ficava em zero enquanto ele ia lancando compras.
--
-- O MODELO NOVO, decidido por ele em 15/09/2026
-- A fatura tem dois tempos:
--   ABERTA   vale a soma das compras lancadas naquele ciclo. Ninguem digita
--            nada, ela acumula sozinha, e nao ha excedente.
--   FECHADA  vale o valor confirmado. O que passa da soma das compras e o
--            excedente: o que entrou na fatura sem ter sido lancado em detalhe.
--
-- Com isso `carteiras.usado` deixa de ser digitado e passa a ser derivado: a
-- soma das faturas que ainda nao foram pagas.
--
-- E o ciclo passa a valer de verdade. O dia de fechamento do cartao, que estava
-- no schema desde a 0001 sem nunca ser usado, decide em qual fatura a compra
-- cai. Ciclo ja fechado ou pago nao recebe compra nova: ela vai para o proximo.

-- ============================================================
-- 1. EM QUE FATURA A COMPRA CAI
-- ============================================================
create or replace function private.fn_ciclo_do_cartao(p_cartao uuid, p_data date)
returns date language plpgsql stable set search_path = public as $$
declare
  v_cartao carteiras%rowtype;
  v_mes date;
  v_venc date;
  k int := 0;
begin
  select * into v_cartao from carteiras where id = p_cartao and tipo = 'cartao';
  if not found then return p_data; end if;

  v_mes := date_trunc('month', p_data)::date;

  -- Passou do fechamento: a compra ja e da proxima fatura, como no banco.
  if v_cartao.dia_fechamento is not null
     and extract(day from p_data)::int > v_cartao.dia_fechamento then
    v_mes := (v_mes + interval '1 month')::date;
  end if;

  -- Ciclo fechado ou pago nao recebe compra nova.
  loop
    v_venc := private.fn_data_no_mes(
      extract(year from v_mes)::int, extract(month from v_mes)::int,
      coalesce(v_cartao.dia_vencimento, 10));

    exit when not exists (
      select 1 from lancamentos f
       left join pagamentos p on p.lancamento_id = f.id
       where f.cartao_id = p_cartao
         and date_trunc('month', f.data_vencimento) = date_trunc('month', v_venc)
         and (f.valor_previsto is not null or p.id is not null)
    );

    v_mes := (v_mes + interval '1 month')::date;
    k := k + 1;
    exit when k > 24;
  end loop;

  return v_venc;
end $$;

-- ============================================================
-- 2. FECHAR A FATURA E SO PARA CIMA
-- ============================================================
-- O valor confirmado nunca pode ser menor do que o que ja foi lancado em
-- detalhe: sobraria um excedente negativo, que nao existe.
create or replace function private.fn_valida_fatura_fechada()
returns trigger language plpgsql set search_path = public as $$
declare v_detalhado numeric;
begin
  if new.cartao_id is null or new.valor_previsto is null then return new; end if;
  if TG_OP = 'UPDATE' and old.valor_previsto is not distinct from new.valor_previsto then
    return new;
  end if;

  select coalesce(sum(coalesce(x.valor_previsto, 0)), 0) into v_detalhado
    from lancamentos x
   where x.casal_id = new.casal_id
     and x.tipo = 'despesa'
     and x.cartao_id is null
     and x.forma_metodo = 'credito'
     and x.forma_ref = new.cartao_id::text
     and x.data_vencimento >= date_trunc('month', new.data_vencimento)::date
     and x.data_vencimento <  (date_trunc('month', new.data_vencimento) + interval '1 month')::date;

  if new.valor_previsto < v_detalhado then
    raise exception 'A fatura fechada não pode ser menor que as compras já lançadas nela (%).',
      to_char(v_detalhado, 'FM999G999D00') using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger trg_valida_fatura_fechada
  before insert or update of valor_previsto on lancamentos
  for each row execute function private.fn_valida_fatura_fechada();

-- ============================================================
-- 3. A VIEW
-- ============================================================
drop view v_lancamentos;

create view v_lancamentos with (security_invoker = true) as
select
  l.*,
  coalesce(f.valor_caixa, l.valor_previsto) as valor_caixa,
  coalesce(f.valor_detalhado, 0)            as valor_detalhado,
  coalesce(f.itens_no_ciclo, 0)             as itens_no_ciclo,
  case
    when l.cartao_id is not null then greatest(f.valor_caixa - f.valor_detalhado, 0)
    else l.valor_previsto
  end as valor_exibido,
  case
    when pg.id is null           then null
    when l.cartao_id is not null then greatest(pg.valor_pago - f.detalhado_pago, 0)
    else pg.valor_pago
  end as valor_realizado,
  coalesce(l.cartao_id is not null and f.valor_detalhado > f.valor_caixa, false)
    as fatura_estourada,
  (l.cartao_id is not null and l.valor_previsto is null and pg.id is null)
    as fatura_aberta,
  case
    when l.cartao_id is not null
      then coalesce(c.dia_vencimento, extract(day from l.data_vencimento)::int)
    else extract(day from l.data_vencimento)::int
  end as dia_exibido,
  c.dia_fechamento as cartao_fechamento
from lancamentos l
left join carteiras  c  on c.id = l.cartao_id
left join pagamentos pg on pg.lancamento_id = l.id
left join lateral (
  select
    -- Paga, vale o que saiu. Fechada, vale o que foi confirmado. Aberta, vale o
    -- que ja foi lancado em detalhe: ela acumula sozinha ate o fechamento.
    coalesce(pg.valor_pago, l.valor_previsto, d.previsto, 0) as valor_caixa,
    coalesce(d.previsto, 0) as valor_detalhado,
    coalesce(d.pago, 0)     as detalhado_pago,
    coalesce(d.itens, 0)    as itens_no_ciclo
  from (
    -- forma_ref e comparado como TEXTO. A coluna aceita 'Rodolfo' e 'Thainy'
    -- para dinheiro, e um cast para uuid derrubaria a view inteira.
    select sum(coalesce(x.valor_previsto, 0)) as previsto,
           sum(coalesce(xp.valor_pago, 0))    as pago,
           count(*)                           as itens
      from lancamentos x
      left join pagamentos xp on xp.lancamento_id = x.id
     where x.casal_id     = l.casal_id
       and x.tipo         = 'despesa'
       and x.cartao_id is null
       and x.forma_metodo = 'credito'
       and x.forma_ref    = l.cartao_id::text
       and x.data_vencimento >= date_trunc('month', l.data_vencimento)::date
       and x.data_vencimento <  (date_trunc('month', l.data_vencimento) + interval '1 month')::date
  ) d
  where l.cartao_id is not null
) f on true;

grant select on v_lancamentos to authenticated;

-- ============================================================
-- 4. O USADO DO CARTAO PASSA A SER DERIVADO
-- ============================================================
create or replace function private.fn_recalcula_usado(p_cartao uuid)
returns void language plpgsql set search_path = public as $$
begin
  if p_cartao is null then return; end if;

  update carteiras c
     set usado = coalesce((
       select sum(
         coalesce(pg.valor_pago, f.valor_previsto, (
           select sum(coalesce(x.valor_previsto, 0))
             from lancamentos x
            where x.casal_id = f.casal_id
              and x.tipo = 'despesa'
              and x.cartao_id is null
              and x.forma_metodo = 'credito'
              and x.forma_ref = f.cartao_id::text
              and x.data_vencimento >= date_trunc('month', f.data_vencimento)::date
              and x.data_vencimento <  (date_trunc('month', f.data_vencimento) + interval '1 month')::date
         ), 0)
       )
       from lancamentos f
       left join pagamentos pg on pg.lancamento_id = f.id
      where f.cartao_id = p_cartao
        and pg.id is null
     ), 0)
   where c.id = p_cartao and c.tipo = 'cartao';
end $$;

create or replace function private.fn_usado_por_lancamento()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP <> 'INSERT' then
    perform private.fn_recalcula_usado(old.cartao_id);
    if old.forma_metodo = 'credito' and old.forma_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform private.fn_recalcula_usado(old.forma_ref::uuid);
    end if;
  end if;
  if TG_OP <> 'DELETE' then
    perform private.fn_recalcula_usado(new.cartao_id);
    if new.forma_metodo = 'credito' and new.forma_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform private.fn_recalcula_usado(new.forma_ref::uuid);
    end if;
  end if;
  return null;
end $$;

create trigger trg_usado_por_lancamento
  after insert or delete or update of valor_previsto, forma_metodo, forma_ref, data_vencimento, cartao_id
  on lancamentos
  for each row execute function private.fn_usado_por_lancamento();

create or replace function private.fn_usado_por_pagamento()
returns trigger language plpgsql set search_path = public as $$
declare v_cartao uuid;
begin
  v_cartao := case when TG_OP = 'INSERT' then new.cartao_id else old.cartao_id end;
  perform private.fn_recalcula_usado(v_cartao);
  return null;
end $$;

create trigger trg_usado_por_pagamento
  after insert or delete on pagamentos
  for each row execute function private.fn_usado_por_pagamento();

-- O trg_fatura_pagamento existia so para zerar e restaurar carteiras.usado.
-- Agora a fatura paga simplesmente sai da soma das faturas em aberto, e
-- desfazer a devolve. Manter os dois seria ter duas fontes de verdade para o
-- mesmo numero, com a ordem alfabetica dos gatilhos decidindo qual vence.
drop trigger if exists trg_fatura_pagamento on pagamentos;
drop function if exists private.fn_fatura_pagamento();

-- ============================================================
-- 5. A FATURA NASCE ABERTA
-- ============================================================
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
      extract(year from current_date)::int,
      extract(month from current_date)::int,
      coalesce(new.dia_vencimento, 10)
    ),
    v_categoria, 'debito', v_conta::text, new.dono, new.id, auth.uid()
  );

  return new;
end $$;

-- ============================================================
-- 6. CRIAR LANCAMENTO RESPEITA O CICLO
-- ============================================================
create or replace function fn_criar_lancamentos(
  p_tipo lanc_tipo,
  p_descricao text,
  p_pagar_a text,
  p_natureza natureza_tipo,
  p_tipo_valor valor_tipo,
  p_valor numeric,
  p_data_emissao date,
  p_data_vencimento date,
  p_categoria_id uuid,
  p_forma_metodo metodo_tipo,
  p_forma_ref text,
  p_dono dono_tipo,
  p_investimento_id uuid default null,
  p_parcelas int default 1,
  p_observacoes text default null,
  p_comprovante_url text default null,
  p_pago boolean default false,
  p_pago_data date default null,
  p_pago_hora time default null
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_casal uuid := private.meu_casal();
  v_grupo uuid;
  v_total int := greatest(coalesce(p_parcelas, 1), 1);
  v_dia int;
  v_base date;
  v_primeiro uuid;
  v_id uuid;
  v_data date;
  k int;
begin
  if v_casal is null then
    raise exception 'Sessão sem perfil. Entre de novo.' using errcode = 'insufficient_privilege';
  end if;
  if p_descricao is null or length(trim(p_descricao)) = 0 then
    raise exception 'Informe a descrição do lançamento.' using errcode = 'check_violation';
  end if;
  if p_pago and p_valor is null then
    raise exception 'Informe o valor para marcar como já pago.' using errcode = 'check_violation';
  end if;

  if p_natureza <> 'parcelada' then
    v_total := 1;
  end if;

  v_base := p_data_vencimento;
  v_dia  := extract(day from p_data_vencimento)::int;

  -- No credito quem manda e o ciclo do cartao: a data da compra decide em qual
  -- fatura ela cai, respeitando o fechamento e pulando ciclo ja fechado.
  if p_forma_metodo = 'credito' and p_forma_ref is not null
     and p_forma_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_base := private.fn_ciclo_do_cartao(
      p_forma_ref::uuid, coalesce(p_data_emissao, p_data_vencimento));
    v_dia := extract(day from v_base)::int;
  end if;

  if v_total > 1 then
    v_grupo := gen_random_uuid();
  end if;

  for k in 0 .. v_total - 1 loop
    v_data := private.fn_data_no_mes(
      extract(year  from (v_base + (k || ' month')::interval))::int,
      extract(month from (v_base + (k || ' month')::interval))::int,
      v_dia
    );

    insert into lancamentos (
      casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
      data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
      dono, investimento_id, grupo_parcelas, parcela_atual, parcela_total,
      observacoes, comprovante_url, criado_por
    ) values (
      v_casal, p_tipo, trim(p_descricao), p_pagar_a, p_natureza, p_tipo_valor, p_valor,
      p_data_emissao, v_data,
      case when p_tipo = 'despesa' and v_data < current_date
           then 'atrasado'::status_tipo else 'pendente'::status_tipo end,
      p_categoria_id, p_forma_metodo, p_forma_ref, p_dono, p_investimento_id,
      v_grupo,
      case when v_total > 1 then k + 1 end,
      case when v_total > 1 then v_total end,
      nullif(trim(coalesce(p_observacoes, '')), ''), p_comprovante_url,
      auth.uid()
    ) returning id into v_id;

    if k = 0 then v_primeiro := v_id; end if;
  end loop;

  if p_pago then
    insert into pagamentos (
      lancamento_id, data_pagamento, hora_pagamento, valor_pago,
      forma_metodo, forma_ref, confirmado_por
    ) values (
      v_primeiro, coalesce(p_pago_data, current_date), coalesce(p_pago_hora, localtime),
      p_valor, p_forma_metodo, p_forma_ref, auth.uid()
    )
    on conflict (lancamento_id) do update
      set data_pagamento = excluded.data_pagamento,
          hora_pagamento = excluded.hora_pagamento,
          valor_pago     = excluded.valor_pago,
          forma_metodo   = excluded.forma_metodo,
          forma_ref      = excluded.forma_ref,
          confirmado_por = excluded.confirmado_por;
  end if;

  return v_primeiro;
end $$;

revoke all on function fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int, text, text, boolean, date, time
) from public;
grant execute on function fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int, text, text, boolean, date, time
) to authenticated;

-- ============================================================
-- 7. ALINHA O QUE JA EXISTE
-- ============================================================
select private.fn_recalcula_usado(id) from carteiras where tipo = 'cartao';
