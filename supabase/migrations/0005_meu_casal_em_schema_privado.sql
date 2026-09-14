-- ESTLIM · meu_casal() sai do schema public
-- As policies precisam de EXECUTE na funcao, entao revogar do papel authenticated
-- quebra o RLS inteiro. A saida certa e tirar a funcao do schema exposto pelo
-- PostgREST: em private ela continua chamavel pelas policies e some da API REST.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.meu_casal()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select casal_id from perfis where id = auth.uid()
$$;

revoke all on function private.meu_casal() from public;
grant execute on function private.meu_casal() to authenticated;

-- ============ POLICIES REFEITAS APONTANDO PARA A FUNCAO PRIVADA ============
drop policy if exists casais_sel on casais;
create policy casais_sel on casais for select to authenticated
  using (id = private.meu_casal());

drop policy if exists perfis_sel on perfis;
drop policy if exists perfis_upd on perfis;
create policy perfis_sel on perfis for select to authenticated
  using (casal_id = private.meu_casal());
create policy perfis_upd on perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and casal_id = private.meu_casal());

do $$
declare t text;
begin
  foreach t in array array[
    'carteiras','categorias','corretoras','investimentos','lancamentos','balancos','ajustes'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_sel', t);
    execute format('drop policy if exists %I on %I', t || '_ins', t);
    execute format('drop policy if exists %I on %I', t || '_upd', t);
    execute format('drop policy if exists %I on %I', t || '_del', t);
    execute format(
      'create policy %I on %I for select to authenticated using (casal_id = private.meu_casal())',
      t || '_sel', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (casal_id = private.meu_casal())',
      t || '_ins', t);
    execute format(
      'create policy %I on %I for update to authenticated using (casal_id = private.meu_casal()) with check (casal_id = private.meu_casal())',
      t || '_upd', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (casal_id = private.meu_casal())',
      t || '_del', t);
  end loop;
end $$;

drop policy if exists pagamentos_sel on pagamentos;
drop policy if exists pagamentos_ins on pagamentos;
drop policy if exists pagamentos_upd on pagamentos;
drop policy if exists pagamentos_del on pagamentos;
create policy pagamentos_sel on pagamentos for select to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = private.meu_casal()));
create policy pagamentos_ins on pagamentos for insert to authenticated
  with check (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = private.meu_casal()));
create policy pagamentos_upd on pagamentos for update to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = private.meu_casal()))
  with check (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = private.meu_casal()));
create policy pagamentos_del on pagamentos for delete to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = private.meu_casal()));

-- ============ STORAGE ============
drop policy if exists corretoras_sel on storage.objects;
drop policy if exists corretoras_ins on storage.objects;
drop policy if exists corretoras_upd on storage.objects;
drop policy if exists corretoras_del on storage.objects;
create policy corretoras_sel on storage.objects for select to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy corretoras_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'corretoras' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy corretoras_upd on storage.objects for update to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = private.meu_casal()::text)
  with check (bucket_id = 'corretoras' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy corretoras_del on storage.objects for delete to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = private.meu_casal()::text);

drop function if exists public.meu_casal();
