-- ESTLIM · o saldo da conta passa a seguir os pagamentos
--
-- Ate aqui o saldo so se mexia pelo ajuste manual. Resultado: o casal recebia
-- o salario, pagava as contas, e o "Saldo em contas" do resumo continuava em
-- R$ 0,00. Agora toda baixa que passa por uma conta move o saldo dela.
--
-- O que move e o que nao move:
--   receita recebida numa conta ......... entra
--   despesa paga por pix, debito ou
--     transferencia de uma conta ........ sai
--   aporte debitado de uma conta ........ sai da conta e entra no investimento
--   fatura do cartao paga por uma conta .. sai da conta e zera o usado do cartao
--   despesa no credito .................. nao toca em conta nenhuma
--   qualquer coisa em dinheiro .......... nao toca em conta nenhuma
--
-- Quem decide e a forma do PAGAMENTO, nao a do lancamento, porque a tela de
-- baixa deixa pagar por um caminho diferente do previsto. E so vale quando a
-- referencia aponta para uma carteira tipo 'conta': cartao de credito e as
-- referencias de dinheiro ('Rodolfo', 'Thainy') passam batido.
--
-- Desfazer a baixa apaga o pagamento, e o mesmo gatilho devolve o valor.

create or replace function private.fn_saldo_da_conta()
returns trigger language plpgsql set search_path = public as $$
declare
  v_ref        text;
  v_valor      numeric;
  v_lancamento uuid;
  v_conta      uuid;
  v_tipo       lanc_tipo;
  v_sinal      int;
begin
  if TG_OP = 'INSERT' then
    v_ref := new.forma_ref; v_valor := new.valor_pago; v_lancamento := new.lancamento_id;
  else
    v_ref := old.forma_ref; v_valor := old.valor_pago; v_lancamento := old.lancamento_id;
  end if;

  if v_ref is null or coalesce(v_valor, 0) = 0 then return null; end if;

  -- 'Rodolfo' e 'Thainy' sao referencias de dinheiro, nao sao uuid. Sem este
  -- teste o cast estoura e a baixa inteira falha.
  if v_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  select id into v_conta from carteiras where id = v_ref::uuid and tipo = 'conta';
  if v_conta is null then return null; end if;

  select tipo into v_tipo from lancamentos where id = v_lancamento;

  v_sinal := case when v_tipo = 'receita' then 1 else -1 end;
  if TG_OP = 'DELETE' then v_sinal := -v_sinal; end if;

  update carteiras set saldo = saldo + (v_sinal * v_valor) where id = v_conta;
  return null;
end $$;

create trigger trg_saldo_da_conta
  after insert or delete on pagamentos
  for each row execute function private.fn_saldo_da_conta();

-- ============ O AJUSTE PARA DE MEXER NO SALDO SOZINHO ============
-- Antes desta migration a fn_criar_ajuste movia o saldo na mao, no passo 4.
-- Com o gatilho acima ela passaria a contar duas vezes. Quem move agora e o
-- pagamento espelho que ela ja criava.
--
-- A regra nao afrouxa: o motivo continua sendo validado no passo 1, antes de
-- qualquer escrita. O saldo so se move no passo 3, depois da validacao.
create or replace function fn_criar_ajuste(
  p_carteira_id uuid,
  p_tipo ajuste_tipo,
  p_valor numeric,
  p_motivo text
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_carteira carteiras%rowtype;
  v_categoria uuid;
  v_lancamento uuid;
  v_ajuste uuid;
  v_entrada boolean := (p_tipo = 'entrada');
  v_metodo metodo_tipo;
begin
  -- 1. Motivo primeiro. Sem motivo, o saldo nao se move.
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'O motivo é obrigatório para ajustar o saldo.'
      using errcode = 'check_violation';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.'
      using errcode = 'check_violation';
  end if;

  select * into v_carteira from carteiras where id = p_carteira_id;
  if not found then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  if v_carteira.tipo <> 'conta' then
    raise exception 'O ajuste de saldo vale só para contas, não para cartões.'
      using errcode = 'check_violation';
  end if;

  select id into v_categoria
    from categorias
   where casal_id = v_carteira.casal_id and nome = 'Ajuste de saldo';

  v_metodo := case when v_entrada then 'transferencia'::metodo_tipo else 'debito'::metodo_tipo end;

  -- 2. Lancamento pago espelho, na categoria Ajuste de saldo.
  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
    dono, criado_por
  ) values (
    v_carteira.casal_id,
    case when v_entrada then 'receita'::lanc_tipo else 'despesa'::lanc_tipo end,
    'Ajuste: ' || trim(p_motivo),
    'Balanço mensal',
    'avulsa', 'fixo', p_valor,
    current_date, current_date, 'pago', v_categoria, v_metodo, p_carteira_id::text,
    'Casal', auth.uid()
  ) returning id into v_lancamento;

  -- 3. Data e hora do ajuste ficam no pagamento, como em qualquer baixa.
  --    E e este insert que move o saldo, pelo gatilho trg_saldo_da_conta.
  insert into pagamentos (
    lancamento_id, data_pagamento, hora_pagamento, valor_pago,
    forma_metodo, forma_ref, confirmado_por
  ) values (
    v_lancamento, current_date, localtime, p_valor, v_metodo, p_carteira_id::text, auth.uid()
  );

  insert into ajustes (casal_id, carteira_id, tipo, valor, motivo, lancamento_id, criado_por)
  values (v_carteira.casal_id, p_carteira_id, p_tipo, p_valor, trim(p_motivo), v_lancamento, auth.uid())
  returning id into v_ajuste;

  return v_ajuste;
end $$;

revoke all on function fn_criar_ajuste(uuid, ajuste_tipo, numeric, text) from public;
grant execute on function fn_criar_ajuste(uuid, ajuste_tipo, numeric, text) to authenticated;

-- ============ RETROATIVO ============
-- As baixas que ja existiam nunca chegaram ao saldo. Recalcula cada conta do
-- zero a partir do historico de pagamentos, que e a mesma conta que o gatilho
-- passa a fazer de agora em diante. Roda uma vez so.
update carteiras c
   set saldo = coalesce((
     select sum(case when l.tipo = 'receita' then p.valor_pago else -p.valor_pago end)
       from pagamentos p
       join lancamentos l on l.id = p.lancamento_id
      where p.forma_ref = c.id::text
   ), 0)
 where c.tipo = 'conta';
