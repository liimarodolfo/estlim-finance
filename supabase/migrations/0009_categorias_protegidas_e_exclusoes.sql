-- ESTLIM · protecao das categorias de sistema e exclusoes seguras

-- ============ CATEGORIA PROTEGIDA ============
-- Salario, Ajuste de saldo e Investimentos sao usadas por regra de negocio.
-- Renomear ou excluir qualquer uma delas quebraria o ajuste de saldo e o
-- balanco, entao a trava mora no banco, nao so na tela.
create or replace function private.fn_protege_categoria()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    if old.protegida then
      raise exception 'A categoria % e do sistema e nao pode ser excluida.', old.nome
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if old.protegida and new.nome is distinct from old.nome then
    raise exception 'A categoria % e do sistema e nao pode ser renomeada.', old.nome
      using errcode = 'check_violation';
  end if;
  if old.protegida and new.protegida = false then
    raise exception 'A categoria % e do sistema e nao pode deixar de ser protegida.', old.nome
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger trg_protege_categoria
  before update or delete on categorias
  for each row execute function private.fn_protege_categoria();

-- ============ EXCLUIR CATEGORIA ============
-- Os lancamentos que usavam a categoria nao podem ficar orfaos nem sumir:
-- passam para Contas fixas, e so entao a categoria sai.
create or replace function fn_excluir_categoria(p_categoria_id uuid)
returns int
language plpgsql
as $$
declare
  v_categoria categorias%rowtype;
  v_destino uuid;
  v_movidos int;
begin
  select * into v_categoria from categorias where id = p_categoria_id;
  if not found then
    raise exception 'Categoria nao encontrada.' using errcode = 'no_data_found';
  end if;
  if v_categoria.protegida then
    raise exception 'A categoria % e do sistema e nao pode ser excluida.', v_categoria.nome
      using errcode = 'check_violation';
  end if;

  select id into v_destino
    from categorias
   where casal_id = v_categoria.casal_id and nome = 'Contas fixas' and id <> p_categoria_id;

  update lancamentos set categoria_id = v_destino where categoria_id = p_categoria_id;
  get diagnostics v_movidos = row_count;

  delete from categorias where id = p_categoria_id;
  return v_movidos;
end $$;

revoke all on function fn_excluir_categoria(uuid) from public;
grant execute on function fn_excluir_categoria(uuid) to authenticated;

-- ============ EXCLUIR CORRETORA ============
-- Corretora com investimento vinculado nao sai, porque o dinheiro mora la.
create or replace function fn_excluir_corretora(p_corretora_id uuid)
returns void
language plpgsql
as $$
declare v_vinculados int;
begin
  select count(*) into v_vinculados from investimentos where corretora_id = p_corretora_id;
  if v_vinculados > 0 then
    raise exception 'Ha % investimento(s) nessa corretora. Mova ou exclua antes.', v_vinculados
      using errcode = 'foreign_key_violation';
  end if;
  delete from corretoras where id = p_corretora_id;
end $$;

revoke all on function fn_excluir_corretora(uuid) from public;
grant execute on function fn_excluir_corretora(uuid) to authenticated;

-- ============ EXCLUIR INVESTIMENTO ============
-- O investimento sai do patrimonio, mas os aportes historicos continuam na
-- lista de lancamentos, apenas sem destino. O on delete set null da coluna
-- investimento_id ja cuida disso; a funcao existe para o retorno ser explicito.
create or replace function fn_excluir_investimento(p_investimento_id uuid)
returns int
language plpgsql
as $$
declare v_aportes int;
begin
  select count(*) into v_aportes from lancamentos where investimento_id = p_investimento_id;
  delete from investimentos where id = p_investimento_id;
  return v_aportes;
end $$;

revoke all on function fn_excluir_investimento(uuid) from public;
grant execute on function fn_excluir_investimento(uuid) to authenticated;
