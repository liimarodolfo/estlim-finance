-- ESTLIM · row level security
-- Regra unica: cada usuario so enxerga e escreve linhas do proprio casal.
-- Toda tabela nasce com RLS ligado, antes de qualquer query do frontend.

-- meu_casal() e security definer de proposito: se lesse perfis com o RLS do
-- chamador, a politica de perfis chamaria a si mesma e entraria em recursao.
create or replace function meu_casal()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select casal_id from perfis where id = auth.uid()
$$;

revoke all on function meu_casal() from public;
grant execute on function meu_casal() to authenticated;

-- ============ CASAIS ============
alter table casais enable row level security;
create policy casais_sel on casais for select to authenticated
  using (id = meu_casal());

-- ============ PERFIS ============
-- Le todos os perfis do casal, edita apenas o proprio.
alter table perfis enable row level security;
create policy perfis_sel on perfis for select to authenticated
  using (casal_id = meu_casal());
create policy perfis_upd on perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and casal_id = meu_casal());

-- ============ TABELAS DE DADOS DO CASAL ============
-- carteiras, categorias, corretoras, investimentos, lancamentos, balancos e ajustes
-- seguem exatamente o mesmo padrao.
do $$
declare t text;
begin
  foreach t in array array[
    'carteiras','categorias','corretoras','investimentos','lancamentos','balancos','ajustes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select to authenticated using (casal_id = meu_casal())',
      t || '_sel', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (casal_id = meu_casal())',
      t || '_ins', t);
    execute format(
      'create policy %I on %I for update to authenticated using (casal_id = meu_casal()) with check (casal_id = meu_casal())',
      t || '_upd', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (casal_id = meu_casal())',
      t || '_del', t);
  end loop;
end $$;

-- ============ PAGAMENTOS ============
-- Nao tem casal_id proprio: o dono vem do lancamento correspondente.
alter table pagamentos enable row level security;
create policy pagamentos_sel on pagamentos for select to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = meu_casal()));
create policy pagamentos_ins on pagamentos for insert to authenticated
  with check (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = meu_casal()));
create policy pagamentos_upd on pagamentos for update to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = meu_casal()))
  with check (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = meu_casal()));
create policy pagamentos_del on pagamentos for delete to authenticated
  using (exists (select 1 from lancamentos l where l.id = lancamento_id and l.casal_id = meu_casal()));

-- ============ ANONIMO NAO LE NADA ============
-- Sem politica para o papel anon, nenhuma linha vaza para quem nao fez login.
revoke all on all tables in schema public from anon;
