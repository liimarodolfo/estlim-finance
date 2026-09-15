-- ESTLIM · fatura liquida do cartao e despesa no credito que nasce paga
--
-- O PROBLEMA
-- O Rodolfo digita a mao o valor fechado da fatura em carteiras.usado, porque
-- tem gasto que ele nao controla item a item. Mas ele tambem cadastra as
-- despesas que consegue controlar, e elas foram pagas naquele mesmo cartao.
-- Os R$ 119,00 da Hospedagem RLiima ja estao dentro dos R$ 502,79 da fatura, e
-- o app somava os dois: 975,24 em vez de 856,24 no total de despesas.
--
-- A SOLUCAO
-- A fatura passa a valer o usado MENOS o que ja foi lancado em detalhe naquele
-- ciclo. Ela vira a sobra nao detalhada. Cada despesa que o usuario lanca
-- descasca a fatura para a categoria certa, e a soma continua fechando no valor
-- que o banco cobra.
--
-- E despesa no credito nasce paga: quem quitou a compra foi a operadora. A
-- divida nao sumiu, migrou para a fatura, que e paga depois. Como a baixa dela
-- aponta para o cartao, e nao para uma conta, nenhum saldo se move.
--
-- CAIXA E COMPETENCIA
-- Com isso o mesmo lancamento passa a ter dois valores, e a view expoe os dois:
--   valor_caixa     bruto, o que sai da conta quando a fatura for paga
--   valor_exibido   liquido, o que todas as somas de despesa do app usam
--   valor_realizado liquido, a coluna Realizado do Balanco
-- Fora da fatura os tres coincidem. So a linha da fatura os separa.
--
-- Esta migration tambem corrige tres defeitos encontrados no caminho, anotados
-- em cada secao.

-- ============================================================
-- 1. O PAGAMENTO PASSA A CARREGAR O QUE PRECISA PARA SER DESFEITO
-- ============================================================
-- Defeito confirmado no banco: saldo 1.000 virava 1.500 na baixa de uma receita
-- e 2.000 ao excluir o lancamento. Com on delete cascade, o pagamento so e
-- apagado depois que o lancamento pai ja sumiu, entao fn_saldo_da_conta nao
-- achava mais o tipo, caia no ramo de despesa e somava em vez de subtrair. Em
-- despesa o erro coincidia com o certo, e foi por isso que passou despercebido.
-- O mesmo valia para fn_fatura_pagamento: excluir uma fatura paga nunca
-- devolvia o limite do cartao.
--
-- A causa raiz e consultar o pai na hora de desfazer. Apagar a baixa antes, num
-- before delete, nao resolve: o delete em pagamentos dispara o update de status
-- na mesma linha que esta sendo apagada, e o Postgres recusa.
--
-- Entao o pagamento passa a guardar o tipo e o cartao do lancamento, como ja
-- guardava a forma e a referencia. Ele e um fato historico: precisa bastar-se.
alter table pagamentos
  add column lanc_tipo lanc_tipo,
  add column cartao_id uuid;

update pagamentos p
   set lanc_tipo = l.tipo, cartao_id = l.cartao_id
  from lancamentos l
 where l.id = p.lancamento_id;

create or replace function private.fn_copia_do_lancamento()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lanc_tipo is null or new.cartao_id is null then
    select l.tipo, l.cartao_id into new.lanc_tipo, new.cartao_id
      from lancamentos l where l.id = new.lancamento_id;
  end if;
  return new;
end $$;

create trigger trg_copia_do_lancamento
  before insert on pagamentos
  for each row execute function private.fn_copia_do_lancamento();

-- Os tres gatilhos que desfaziam consultando o pai agora leem do proprio
-- registro, e funcionam em qualquer ordem de exclusao.
create or replace function private.fn_saldo_da_conta()
returns trigger language plpgsql set search_path = public as $$
declare
  v_ref   text;
  v_valor numeric;
  v_tipo  lanc_tipo;
  v_conta uuid;
  v_sinal int;
begin
  if TG_OP = 'INSERT' then
    v_ref := new.forma_ref; v_valor := new.valor_pago; v_tipo := new.lanc_tipo;
  else
    v_ref := old.forma_ref; v_valor := old.valor_pago; v_tipo := old.lanc_tipo;
  end if;

  if v_ref is null or coalesce(v_valor, 0) = 0 or v_tipo is null then return null; end if;

  -- 'Rodolfo' e 'Thainy' sao referencias de dinheiro, nao sao uuid. Sem este
  -- teste o cast estoura e a baixa inteira falha.
  if v_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  select id into v_conta from carteiras where id = v_ref::uuid and tipo = 'conta';
  if v_conta is null then return null; end if;

  v_sinal := case when v_tipo = 'receita' then 1 else -1 end;
  if TG_OP = 'DELETE' then v_sinal := -v_sinal; end if;

  update carteiras set saldo = saldo + (v_sinal * v_valor) where id = v_conta;
  return null;
end $$;

create or replace function private.fn_fatura_pagamento()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.cartao_id is not null then
      update carteiras set usado = 0 where id = new.cartao_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.cartao_id is not null then
      update carteiras set usado = old.valor_pago where id = old.cartao_id;
    end if;
  end if;
  return null;
end $$;

create or replace function private.fn_aporte_investimento()
returns trigger language plpgsql set search_path = public as $$
declare v_investimento uuid;
begin
  if TG_OP = 'INSERT' then
    select investimento_id into v_investimento from lancamentos
     where id = new.lancamento_id and tipo = 'investimento';
    if v_investimento is not null then
      update investimentos set valor = valor + new.valor_pago where id = v_investimento;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.lanc_tipo = 'investimento' then
      select investimento_id into v_investimento from lancamentos where id = old.lancamento_id;
      if v_investimento is not null then
        update investimentos set valor = greatest(0, valor - old.valor_pago) where id = v_investimento;
      end if;
    end if;
  end if;
  return null;
end $$;

-- ============================================================
-- 2. RECEITA NUNCA E NO CREDITO
-- ============================================================
-- Simetrico ao chk_aporte_sem_credito que ja existia. O formulario nunca
-- ofereceu credito para receita, mas a edicao escreve direto na tabela, e uma
-- receita no credito descascaria a fatura pelo lado errado.
alter table lancamentos add constraint chk_receita_sem_credito
  check (tipo <> 'receita' or forma_metodo is distinct from 'credito');

-- ============================================================
-- 3. DESPESA NO CREDITO NASCE PAGA
-- ============================================================
-- Gatilho na tabela, nao dentro de fn_criar_lancamentos, porque existem tres
-- caminhos de escrita: a RPC, o update direto da tela de edicao, e o insert de
-- fn_virada_mes. A regra tem que valer nos tres.
--
-- Data e hora: a regra do check de baixa fala do clique. Aqui nao ha clique, e
-- sim consequencia, entao vale a data de emissao da compra, ou a do registro
-- quando a emissao nao foi informada.
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
      new.id, coalesce(new.data_emissao, current_date), localtime,
      new.valor_previsto, 'credito', new.forma_ref,
      coalesce(auth.uid(), new.criado_por)
    );
    return null;
  end if;

  -- O valor mudou na edicao: a baixa espelho acompanha, senao previsto e
  -- realizado do mes divergem para sempre.
  if v_credito and v_baixa.forma_metodo = 'credito'
     and (v_baixa.valor_pago is distinct from new.valor_previsto
          or v_baixa.forma_ref is distinct from new.forma_ref) then
    update pagamentos
       set valor_pago = new.valor_previsto, forma_ref = new.forma_ref
     where lancamento_id = new.id;
    return null;
  end if;

  -- Saiu do credito, ou perdeu o valor: a baixa automatica some, e o
  -- trg_status_do_pagamento devolve o status no delete.
  if not v_credito and v_baixa.forma_metodo = 'credito' then
    delete from pagamentos where lancamento_id = new.id;
  end if;

  return null;
end $$;

-- 'status' fica FORA da lista de colunas de proposito: trg_status_do_pagamento
-- faz update lancamentos set status = 'pago', e o gatilho reentraria.
create trigger trg_baixa_no_credito
  after insert or update of tipo, forma_metodo, forma_ref, valor_previsto
  on lancamentos
  for each row execute function private.fn_baixa_no_credito();

-- ============================================================
-- 4. A VIEW
-- ============================================================
-- Indice que sustenta o descasque sem varrer a tabela.
create index lancamentos_credito_idx
  on lancamentos (casal_id, forma_ref, data_vencimento)
  where forma_metodo = 'credito';

drop view v_lancamentos;

-- Cuidados que parecem detalhe e nao sao:
--   forma_ref e comparado como TEXTO. A coluna aceita 'Rodolfo' e 'Thainy' para
--     dinheiro; um unico cast para uuid derruba a view inteira e deixa todas as
--     telas em branco.
--   coalesce em volta do sum: sem ele, zero linhas devolvem null, a subtracao
--     vira null, e as verificacoes dos testes nao entram no then.
--   o where do lateral fica no nivel de fora, entao o planner nao executa o
--     corpo para linha que nao e fatura.
create view v_lancamentos with (security_invoker = true) as
select
  l.*,
  coalesce(f.valor_caixa, l.valor_previsto) as valor_caixa,
  coalesce(f.valor_detalhado, 0)            as valor_detalhado,
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
  case
    when l.cartao_id is not null
      then coalesce(c.dia_vencimento, extract(day from l.data_vencimento)::int)
    else extract(day from l.data_vencimento)::int
  end as dia_exibido
from lancamentos l
left join carteiras  c  on c.id = l.cartao_id
left join pagamentos pg on pg.lancamento_id = l.id
left join lateral (
  select
    -- Paga, vale o que foi pago: congela sozinho, sem gatilho, e conserta de
    -- quebra o Previsto que despencava para zero ao pagar a fatura.
    -- No ciclo aberto, vale o usado do cartao.
    -- Nos outros meses, vale o que a virada de mes congelou: o usado e um
    -- numero so, nao uma serie, e a fatura de agosto nao pode ler o limite
    -- utilizado de hoje.
    coalesce(
      pg.valor_pago,
      case when date_trunc('month', l.data_vencimento) = date_trunc('month', current_date)
           then c.usado end,
      l.valor_previsto,
      0
    ) as valor_caixa,
    coalesce(d.previsto, 0) as valor_detalhado,
    coalesce(d.pago, 0)     as detalhado_pago
  from (
    select sum(coalesce(x.valor_previsto, 0)) as previsto,
           sum(coalesce(xp.valor_pago, 0))    as pago
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
-- 5. CRIAR LANCAMENTO, V3
-- ============================================================
-- Duas correcoes junto com a assinatura que ja existia:
--   o guard p_tipo = 'despesa' no status volta. A 0017 reescreveu a funcao e
--   perdeu o que a 0013 tinha acrescentado, entao receita vencida voltou a
--   nascer atrasada.
--   o insert do pagamento vira upsert, porque o gatilho do credito ja criou a
--   baixa e bateria no unique. Nao existe gatilho de update em pagamentos,
--   entao o ramo do update nao refaz movimento de saldo nenhum, e a data
--   informada pelo usuario prevalece sobre a automatica.
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
  if p_pago and p_valor is null then
    raise exception 'Informe o valor para marcar como já pago.' using errcode = 'check_violation';
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

  -- A baixa do cadastro vale so para a primeira parcela. Marcar 5 parcelas
  -- futuras como pagas de uma vez nao existe no mundo real, fora do credito,
  -- onde a operadora quitou todas de uma vez e o gatilho ja cuidou disso.
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
-- 6. A VIRADA DE MES CONGELA A FATURA QUE FECHA
-- ============================================================
-- carteiras.usado e um numero so, do ciclo aberto. Sem congelar, a fatura de
-- setembro deixada em aberto continuaria lendo o usado de outubro, e as duas
-- apareceriam com o mesmo valor: a duplicacao voltaria por outra porta.
create or replace function private.fn_virada_mes(p_referencia date default current_date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_inicio date := date_trunc('month', p_referencia)::date;
  v_anterior date := (v_inicio - interval '1 month')::date;
  v_fim_anterior date := (v_inicio - interval '1 day')::date;
  v_qtd int;
begin
  -- Antes de qualquer coisa, a fatura que fecha guarda quanto ela era.
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

-- ============================================================
-- 7. RETROATIVO
-- ============================================================
-- As despesas no credito que ja existiam ganham a baixa espelho. A data e a da
-- emissao, que e o dia da compra; a hora e a desta migration, porque nao existe
-- hora verdadeira para inventar.
--
-- Nao dispara fn_fatura_pagamento (cartao_id nulo) e nao move saldo nenhum
-- (a referencia e um cartao, nao uma conta).
insert into pagamentos (
  lancamento_id, data_pagamento, hora_pagamento, valor_pago,
  forma_metodo, forma_ref, confirmado_por
)
select
  l.id,
  least(coalesce(l.data_emissao, l.data_vencimento), current_date),
  localtime,
  l.valor_previsto,
  'credito', l.forma_ref, l.criado_por
from lancamentos l
where l.tipo = 'despesa'
  and l.forma_metodo = 'credito'
  and l.cartao_id is null
  and l.forma_ref is not null
  and coalesce(l.valor_previsto, 0) > 0
  and not exists (select 1 from pagamentos p where p.lancamento_id = l.id);
