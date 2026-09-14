-- ESTLIM · perfil criado no cadastro, so para quem foi convidado
-- O app usa a anon key, entao a rota de cadastro fica aberta na internet.
-- A tabela de convites fecha essa porta: sem convite, o cadastro falha no banco,
-- nao na tela. Para liberar mais alguem depois, basta inserir uma linha aqui.

create table convites (
  email text primary key,
  casal_id uuid not null references casais(id),
  nome text not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);

alter table convites enable row level security;
-- O casal enxerga os proprios convites. Ninguem escreve pela API.
create policy convites_sel on convites for select to authenticated
  using (casal_id = private.meu_casal());

insert into convites (email, casal_id, nome) values
  ('rodolfo@rliima.com', '00000000-0000-4000-8000-000000000001', 'Rodolfo'),
  ('thainy@rliima.com',  '00000000-0000-4000-8000-000000000001', 'Thainy')
on conflict (email) do nothing;

-- Abre o perfil no cadastro, ja apontando para o casal do convite.
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

  insert into perfis (id, casal_id, nome)
  values (new.id, convite.casal_id, convite.nome)
  on conflict (id) do nothing;

  update convites set usado_em = now() where email = convite.email;
  return new;
end $$;

create trigger trg_perfil_no_cadastro
  after insert on auth.users
  for each row execute function private.fn_perfil_no_cadastro();
