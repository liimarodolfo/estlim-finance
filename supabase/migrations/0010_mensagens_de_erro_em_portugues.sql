-- ESTLIM · mensagens de erro em portugues correto
-- As excecoes destas funcoes aparecem no toast, para o usuario ler. Escrevi sem
-- acento nas primeiras versoes e ficou feio na tela. Aqui so o texto muda: a
-- logica de cada funcao e identica a da migration que a criou.

create or replace function fn_criar_ajuste(
  p_carteira_id uuid, p_tipo ajuste_tipo, p_valor numeric, p_motivo text
) returns uuid language plpgsql as $$
declare
  v_carteira carteiras%rowtype;
  v_categoria uuid;
  v_lancamento uuid;
  v_ajuste uuid;
  v_entrada boolean := (p_tipo = 'entrada');
  v_metodo metodo_tipo;
begin
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'O motivo é obrigatório para ajustar o saldo.' using errcode = 'check_violation';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = 'check_violation';
  end if;

  select * into v_carteira from carteiras where id = p_carteira_id;
  if not found then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  if v_carteira.tipo <> 'conta' then
    raise exception 'O ajuste de saldo vale só para contas, não para cartões.' using errcode = 'check_violation';
  end if;

  select id into v_categoria from categorias
   where casal_id = v_carteira.casal_id and nome = 'Ajuste de saldo';

  v_metodo := case when v_entrada then 'transferencia'::metodo_tipo else 'debito'::metodo_tipo end;

  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref, dono, criado_por
  ) values (
    v_carteira.casal_id,
    case when v_entrada then 'receita'::lanc_tipo else 'despesa'::lanc_tipo end,
    'Ajuste: ' || trim(p_motivo), 'Balanço mensal', 'avulsa', 'fixo', p_valor,
    current_date, current_date, 'pago', v_categoria, v_metodo, p_carteira_id::text, 'Casal', auth.uid()
  ) returning id into v_lancamento;

  insert into pagamentos (
    lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref, confirmado_por
  ) values (
    v_lancamento, current_date, localtime, p_valor, v_metodo, p_carteira_id::text, auth.uid()
  );

  update carteiras set saldo = saldo + case when v_entrada then p_valor else -p_valor end
   where id = p_carteira_id;

  insert into ajustes (casal_id, carteira_id, tipo, valor, motivo, lancamento_id, criado_por)
  values (v_carteira.casal_id, p_carteira_id, p_tipo, p_valor, trim(p_motivo), v_lancamento, auth.uid())
  returning id into v_ajuste;

  return v_ajuste;
end $$;

create or replace function fn_excluir_carteira(p_carteira_id uuid)
returns text language plpgsql as $$
declare
  v_carteira carteiras%rowtype;
  v_investimentos int;
  v_historico int;
begin
  select * into v_carteira from carteiras where id = p_carteira_id;
  if not found then
    raise exception 'Carteira não encontrada.' using errcode = 'no_data_found';
  end if;

  select count(*) into v_investimentos from investimentos where carteira_id = p_carteira_id;
  if v_investimentos > 0 then
    raise exception 'Esta conta tem % investimento(s) aplicado(s). Mova ou exclua os investimentos antes.', v_investimentos
      using errcode = 'foreign_key_violation';
  end if;

  delete from lancamentos where cartao_id = p_carteira_id and status <> 'pago';

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

create or replace function private.fn_protege_categoria()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    if old.protegida then
      raise exception 'A categoria % é do sistema e não pode ser excluída.', old.nome
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if old.protegida and new.nome is distinct from old.nome then
    raise exception 'A categoria % é do sistema e não pode ser renomeada.', old.nome
      using errcode = 'check_violation';
  end if;
  if old.protegida and new.protegida = false then
    raise exception 'A categoria % é do sistema e não pode deixar de ser protegida.', old.nome
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function fn_excluir_categoria(p_categoria_id uuid)
returns int language plpgsql as $$
declare
  v_categoria categorias%rowtype;
  v_destino uuid;
  v_movidos int;
begin
  select * into v_categoria from categorias where id = p_categoria_id;
  if not found then
    raise exception 'Categoria não encontrada.' using errcode = 'no_data_found';
  end if;
  if v_categoria.protegida then
    raise exception 'A categoria % é do sistema e não pode ser excluída.', v_categoria.nome
      using errcode = 'check_violation';
  end if;

  select id into v_destino from categorias
   where casal_id = v_categoria.casal_id and nome = 'Contas fixas' and id <> p_categoria_id;

  update lancamentos set categoria_id = v_destino where categoria_id = p_categoria_id;
  get diagnostics v_movidos = row_count;

  delete from categorias where id = p_categoria_id;
  return v_movidos;
end $$;

create or replace function fn_excluir_corretora(p_corretora_id uuid)
returns void language plpgsql as $$
declare v_vinculados int;
begin
  select count(*) into v_vinculados from investimentos where corretora_id = p_corretora_id;
  if v_vinculados > 0 then
    raise exception 'Há % investimento(s) nessa corretora. Mova ou exclua antes.', v_vinculados
      using errcode = 'foreign_key_violation';
  end if;
  delete from corretoras where id = p_corretora_id;
end $$;

create or replace function private.fn_perfil_no_cadastro()
returns trigger language plpgsql security definer set search_path = public as $$
declare convite convites%rowtype;
begin
  select * into convite from convites where email = lower(new.email);

  if not found then
    raise exception 'Este e-mail não tem convite para o ESTLIM.' using errcode = 'insufficient_privilege';
  end if;
  if convite.usado_em is not null then
    raise exception 'Este convite já foi usado.' using errcode = 'insufficient_privilege';
  end if;

  insert into perfis (id, casal_id, nome)
  values (new.id, convite.casal_id, convite.nome)
  on conflict (id) do nothing;

  update convites set usado_em = now() where email = convite.email;
  return new;
end $$;
