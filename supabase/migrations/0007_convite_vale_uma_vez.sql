-- ESTLIM · convite de uso unico
-- As duas contas ja existem e o botao de primeiro acesso saiu da tela. Com o
-- convite valendo uma vez so, nenhum cadastro novo passa, nem pela API direta.
-- Para liberar alguem depois: inserir a linha em convites, ou zerar o usado_em.

create or replace function private.fn_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare convite convites%rowtype;
begin
  select * into convite from convites where email = lower(new.email);

  if not found then
    raise exception 'Este e-mail nao tem convite para o ESTLIM.'
      using errcode = 'insufficient_privilege';
  end if;

  if convite.usado_em is not null then
    raise exception 'Este convite ja foi usado.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into perfis (id, casal_id, nome)
  values (new.id, convite.casal_id, convite.nome)
  on conflict (id) do nothing;

  update convites set usado_em = now() where email = convite.email;
  return new;
end $$;
