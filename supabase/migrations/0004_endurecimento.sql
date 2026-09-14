-- ESTLIM · endurecimento apontado pelo linter de seguranca do Supabase
-- Nenhuma funcao security definer fica exposta como rota RPC sem necessidade.
--
-- ATENCAO, historico: as tres primeiras linhas desta migration derrubaram o RLS
-- inteiro, porque uma policy precisa de EXECUTE na funcao que ela chama. O teste
-- pegou na hora ("permission denied for function meu_casal") e a 0005 corrigiu,
-- movendo a funcao para o schema private em vez de revogar o acesso dela.
-- O arquivo fica aqui para a historia bater com o que o banco recebeu.

revoke execute on function public.meu_casal() from anon;
revoke execute on function public.meu_casal() from authenticated;
revoke execute on function public.meu_casal() from public;

-- rls_auto_enable() e um event trigger da plataforma: dispara sozinho no DDL e
-- nunca precisa ser chamada por rota. Event trigger nao depende de grant.
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
revoke execute on function public.rls_auto_enable() from public;
