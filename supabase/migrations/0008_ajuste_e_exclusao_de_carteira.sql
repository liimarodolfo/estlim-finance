-- ESTLIM · ajuste de saldo e exclusao de carteira
-- Ambas rodam com o RLS do chamador (security invoker), entao nenhuma delas
-- alcanca linha de outro casal.

-- ============ AJUSTE DE SALDO ============
-- Valida o motivo ANTES de encostar no saldo, atualiza a carteira, cria o
-- lancamento pago espelho e registra o ajuste, tudo na mesma transacao. Se
-- qualquer passo falhar, nada fica gravado pela metade.
create or replace function fn_criar_ajuste(
  p_carteira_id uuid,
  p_tipo ajuste_tipo,
  p_valor numeric,
  p_motivo text
) returns uuid
language plpgsql
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
    raise exception 'O motivo e obrigatorio para ajustar o saldo.'
      using errcode = 'check_violation';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.'
      using errcode = 'check_violation';
  end if;

  select * into v_carteira from carteiras where id = p_carteira_id;
  if not found then
    raise exception 'Conta nao encontrada.' using errcode = 'no_data_found';
  end if;
  if v_carteira.tipo <> 'conta' then
    raise exception 'O ajuste de saldo vale so para contas, nao para cartoes.'
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
  insert into pagamentos (
    lancamento_id, data_pagamento, hora_pagamento, valor_pago,
    forma_metodo, forma_ref, confirmado_por
  ) values (
    v_lancamento, current_date, localtime, p_valor, v_metodo, p_carteira_id::text, auth.uid()
  );

  -- 4. So agora o saldo se move.
  update carteiras
     set saldo = saldo + case when v_entrada then p_valor else -p_valor end
   where id = p_carteira_id;

  insert into ajustes (casal_id, carteira_id, tipo, valor, motivo, lancamento_id, criado_por)
  values (v_carteira.casal_id, p_carteira_id, p_tipo, p_valor, trim(p_motivo), v_lancamento, auth.uid())
  returning id into v_ajuste;

  return v_ajuste;
end $$;

revoke all on function fn_criar_ajuste(uuid, ajuste_tipo, numeric, text) from public;
grant execute on function fn_criar_ajuste(uuid, ajuste_tipo, numeric, text) to authenticated;

-- ============ EXCLUSAO DE CARTEIRA ============
-- Conta ou cartao sem historico some de vez. Com historico, vira arquivada:
-- sai das telas, mas os lancamentos e ajustes antigos continuam de pe.
-- Investimento vinculado impede as duas coisas, porque o dinheiro mora la.
create or replace function fn_excluir_carteira(p_carteira_id uuid)
returns text
language plpgsql
as $$
declare
  v_carteira carteiras%rowtype;
  v_investimentos int;
  v_historico int;
begin
  select * into v_carteira from carteiras where id = p_carteira_id;
  if not found then
    raise exception 'Carteira nao encontrada.' using errcode = 'no_data_found';
  end if;

  select count(*) into v_investimentos from investimentos where carteira_id = p_carteira_id;
  if v_investimentos > 0 then
    raise exception 'Esta conta tem % investimento(s) aplicado(s). Mova ou exclua os investimentos antes.', v_investimentos
      using errcode = 'foreign_key_violation';
  end if;

  -- Fatura pendente do cartao morre junto. A paga fica como historico.
  delete from lancamentos
   where cartao_id = p_carteira_id and status <> 'pago';

  select
    (select count(*) from ajustes where carteira_id = p_carteira_id)
    + (select count(*) from lancamentos where cartao_id = p_carteira_id)
    + (select count(*) from lancamentos where forma_ref = p_carteira_id::text)
  into v_historico;

  if v_historico > 0 then
    update carteiras set ativo = false where id = p_carteira_id;
    return 'arquivada';
  end if;

  delete from carteiras where id = p_carteira_id;
  return 'excluida';
end $$;

revoke all on function fn_excluir_carteira(uuid) from public;
grant execute on function fn_excluir_carteira(uuid) to authenticated;
