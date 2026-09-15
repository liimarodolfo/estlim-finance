-- ESTLIM · Realtime
-- Sem entrar na publicacao, o Postgres nao emite nada e o canal do frontend
-- fica mudo. O RLS continua valendo: cada aparelho so recebe mudanca de linha
-- do proprio casal.

do $$
declare t text;
begin
  foreach t in array array[
    'lancamentos','pagamentos','carteiras','investimentos',
    'corretoras','categorias','balancos','ajustes','perfis'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
