-- ESTLIM · parcelas, fatura automatica e os gatilhos da baixa

-- ============ DIA SEGURO ============
-- Dia 31 em fevereiro nao existe. Esta funcao devolve sempre uma data valida.
create or replace function private.fn_data_no_mes(p_ano int, p_mes int, p_dia int)
returns date language sql immutable as $$
  select make_date(p_ano, p_mes, least(p_dia, extract(day from (make_date(p_ano, p_mes, 1) + interval '1 month - 1 day'))::int))
$$;

-- ============ CRIAR LANCAMENTO, COM OU SEM PARCELAS ============
-- Parcelada em N vezes gera N lancamentos, um por mes, ligados pelo mesmo
-- grupo e numerados X/N. No credito, o dia de cada vencimento vem do cartao,
-- nao da data digitada. A virada de ano acontece sozinha, porque a conta e
-- feita com intervalo de mes sobre a data base.
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
  p_parcelas int default 1
) returns uuid
language plpgsql
as $$
declare
  v_casal uuid := private.meu_casal();
  v_grupo uuid;
  v_total int := greatest(coalesce(p_parcelas, 1), 1);
  v_dia int;
  v_cartao carteiras%rowtype;
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

  if p_natureza <> 'parcelada' then
    v_total := 1;
  end if;

  -- No credito, quem manda no dia do vencimento e o cartao.
  v_dia := extract(day from p_data_vencimento)::int;
  if p_forma_metodo = 'credito' and p_forma_ref is not null then
    select * into v_cartao from carteiras where id = p_forma_ref::uuid and tipo = 'cartao';
    if found and v_cartao.dia_vencimento is not null then
      v_dia := v_cartao.dia_vencimento;
    end if;
  end if;

  if v_total > 1 then
    v_grupo := gen_random_uuid();
  end if;

  for k in 0 .. v_total - 1 loop
    v_data := private.fn_data_no_mes(
      extract(year  from (p_data_vencimento + (k || ' month')::interval))::int,
      extract(month from (p_data_vencimento + (k || ' month')::interval))::int,
      v_dia
    );

    insert into lancamentos (
      casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
      data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
      dono, investimento_id, grupo_parcelas, parcela_atual, parcela_total, criado_por
    ) values (
      v_casal, p_tipo, trim(p_descricao), p_pagar_a, p_natureza, p_tipo_valor, p_valor,
      p_data_emissao, v_data,
      case when v_data < current_date then 'atrasado'::status_tipo else 'pendente'::status_tipo end,
      p_categoria_id, p_forma_metodo, p_forma_ref, p_dono, p_investimento_id,
      v_grupo,
      case when v_total > 1 then k + 1 end,
      case when v_total > 1 then v_total end,
      auth.uid()
    ) returning id into v_id;

    if k = 0 then v_primeiro := v_id; end if;
  end loop;

  return v_primeiro;
end $$;

revoke all on function fn_criar_lancamentos(lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date, uuid, metodo_tipo, text, dono_tipo, uuid, int) from public;
grant execute on function fn_criar_lancamentos(lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date, uuid, metodo_tipo, text, dono_tipo, uuid, int) to authenticated;

-- ============ FATURA AUTOMATICA AO CRIAR CARTAO ============
-- Todo cartao novo nasce com uma despesa fixa de valor variavel vinculada a
-- ele, debitando da conta do mesmo dono. O valor exibido vem da view, que le o
-- usado do cartao, entao a fatura acompanha o limite utilizado sozinha.
create or replace function private.fn_criar_fatura()
returns trigger language plpgsql as $$
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
    nullif(new.usado, 0),
    private.fn_data_no_mes(
      extract(year from current_date)::int,
      extract(month from current_date)::int,
      coalesce(new.dia_vencimento, 10)
    ),
    v_categoria, 'debito', v_conta::text, new.dono, new.id, auth.uid()
  );

  return new;
end $$;

create trigger trg_criar_fatura
  after insert on carteiras
  for each row execute function private.fn_criar_fatura();

-- ============ PAGAR A FATURA ZERA O LIMITE, DESFAZER RESTAURA ============
create or replace function private.fn_fatura_pagamento()
returns trigger language plpgsql as $$
declare v_cartao uuid;
begin
  if TG_OP = 'INSERT' then
    select cartao_id into v_cartao from lancamentos where id = new.lancamento_id;
    if v_cartao is not null then
      update carteiras set usado = 0 where id = v_cartao;
    end if;
  elsif TG_OP = 'DELETE' then
    select cartao_id into v_cartao from lancamentos where id = old.lancamento_id;
    if v_cartao is not null then
      update carteiras set usado = old.valor_pago where id = v_cartao;
    end if;
  end if;
  return null;
end $$;

create trigger trg_fatura_pagamento
  after insert or delete on pagamentos
  for each row execute function private.fn_fatura_pagamento();

-- ============ APORTE MOVIMENTA O INVESTIMENTO ============
create or replace function private.fn_aporte_investimento()
returns trigger language plpgsql as $$
declare v_investimento uuid;
begin
  if TG_OP = 'INSERT' then
    select investimento_id into v_investimento from lancamentos
     where id = new.lancamento_id and tipo = 'investimento';
    if v_investimento is not null then
      update investimentos set valor = valor + new.valor_pago where id = v_investimento;
    end if;
  elsif TG_OP = 'DELETE' then
    select investimento_id into v_investimento from lancamentos
     where id = old.lancamento_id and tipo = 'investimento';
    if v_investimento is not null then
      update investimentos set valor = greatest(0, valor - old.valor_pago) where id = v_investimento;
    end if;
  end if;
  return null;
end $$;

create trigger trg_aporte_investimento
  after insert or delete on pagamentos
  for each row execute function private.fn_aporte_investimento();

-- ============ STATUS ACOMPANHA O PAGAMENTO ============
-- Criar o pagamento marca como pago. Apagar devolve para pendente ou atrasado,
-- conforme o vencimento ja tenha passado.
create or replace function private.fn_status_do_pagamento()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update lancamentos set status = 'pago' where id = new.lancamento_id;
  elsif TG_OP = 'DELETE' then
    update lancamentos
       set status = case
         when tipo <> 'despesa' then 'pendente'::status_tipo
         when data_vencimento < current_date then 'atrasado'::status_tipo
         else 'pendente'::status_tipo
       end
     where id = old.lancamento_id;
  end if;
  return null;
end $$;

create trigger trg_status_do_pagamento
  after insert or delete on pagamentos
  for each row execute function private.fn_status_do_pagamento();
