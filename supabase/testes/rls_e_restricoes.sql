-- ESTLIM · teste de RLS e das restricoes de schema
-- Roda com o papel de servico (SQL Editor do painel ou psql como postgres).
-- Cria o cenario, verifica, e limpa tudo no fim. Se algo falhar, levanta excecao
-- com a mensagem FALHOU e nada e gravado alem do que a propria limpeza remove.
--
-- Cobre os itens 4, 5 e parte do 8 da lista de testes minimos do Epico 14.

begin;

-- ============ CENARIO ============
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-4000-8000-00000000000a','authenticated','authenticated','teste.a@estlim.local','x',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0000-4000-8000-00000000000b','authenticated','authenticated','teste.b@estlim.local','x',now(),now(),now())
on conflict (id) do nothing;

insert into casais (id, nome) values ('00000000-0000-4000-8000-0000000000b2','Casal de teste B')
on conflict (id) do nothing;

insert into perfis (id, casal_id, nome) values
  ('aaaaaaaa-0000-4000-8000-00000000000a','00000000-0000-4000-8000-000000000001','Usuario A'),
  ('bbbbbbbb-0000-4000-8000-00000000000b','00000000-0000-4000-8000-0000000000b2','Usuario B')
on conflict (id) do nothing;

insert into carteiras (id, casal_id, dono, tipo, nome, saldo) values
  ('11111111-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Rodolfo','conta','Conta do casal A',100),
  ('22222222-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000b2','Thainy','conta','Conta do casal B',200)
on conflict (id) do nothing;

-- ============ RLS ============
do $$
declare n int;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}',true);

  select count(*) into n from carteiras;
  if n <> 1 then raise exception 'FALHOU: usuario A viu % carteiras, esperado 1', n; end if;
  raise notice 'OK: usuario A enxerga so a carteira do proprio casal';

  begin
    insert into carteiras (casal_id, dono, tipo, nome)
    values ('00000000-0000-4000-8000-0000000000b2','Thainy','conta','Invasao');
    raise exception 'FALHOU: o RLS deixou o usuario A inserir no casal B';
  exception when insufficient_privilege then
    raise notice 'OK: insert no casal alheio bloqueado';
  end;

  update carteiras set saldo = 999 where id = '22222222-0000-4000-8000-000000000002';
  if found then raise exception 'FALHOU: usuario A alterou carteira do casal B'; end if;
  raise notice 'OK: update em carteira alheia nao atinge nenhuma linha';

  delete from carteiras where id = '22222222-0000-4000-8000-000000000002';
  if found then raise exception 'FALHOU: usuario A apagou carteira do casal B'; end if;
  raise notice 'OK: delete em carteira alheia nao atinge nenhuma linha';

  perform set_config('role','postgres',true);
end $$;

-- ============ RESTRICOES DE SCHEMA ============
do $$
declare cat uuid;
        cart uuid  := '11111111-0000-4000-8000-000000000001';
        casal uuid := '00000000-0000-4000-8000-000000000001';
begin
  select id into cat from categorias where casal_id = casal and nome = 'Moradia';

  begin
    insert into investimentos (casal_id, sub, nome, instituicao_tipo, carteira_id, corretora_id, dono)
    values (casal,'ativo','Invalido','banco',cart,gen_random_uuid(),'Casal');
    raise exception 'FALHOU: aceitou banco e corretora no mesmo investimento';
  exception when check_violation then raise notice 'OK: chk_instituicao barrou banco com corretora'; end;

  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, data_vencimento, dono, categoria_id)
    values (casal,'despesa','Sem valor e fixo','fixo','2026-10-10','Rodolfo',cat);
    raise exception 'FALHOU: aceitou valor fixo sem valor previsto';
  exception when check_violation then raise notice 'OK: chk_valor_obrigatorio barrou fixo sem valor'; end;

  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, data_vencimento, dono, categoria_id)
  values (casal,'despesa','TESTE energia eletrica','variavel','2026-10-10','Rodolfo',cat);
  raise notice 'OK: variavel sem valor aceito, que e o que alimenta o selo Adicionar valor';

  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo)
    values (casal,'investimento','Aporte no credito','fixo',100,'2026-10-10','Rodolfo','credito');
    raise exception 'FALHOU: aceitou aporte no credito';
  exception when check_violation then raise notice 'OK: chk_aporte_sem_credito barrou aporte no credito'; end;

  begin
    insert into ajustes (casal_id, carteira_id, tipo, valor, motivo)
    values (casal,cart,'entrada',50,'   ');
    raise exception 'FALHOU: aceitou ajuste com motivo em branco';
  exception when check_violation then raise notice 'OK: ajuste sem motivo barrado no proprio schema'; end;

  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, parcela_atual, parcela_total)
    values (casal,'despesa','Parcela impossivel','fixo',100,'2026-10-10','Rodolfo',3,2);
    raise exception 'FALHOU: aceitou parcela 3 de 2';
  exception when check_violation then raise notice 'OK: chk_parcelas barrou parcela 3 de 2'; end;
end $$;

-- ============ LIMPEZA ============
delete from lancamentos where descricao = 'TESTE energia eletrica';
delete from carteiras where id in ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002');
delete from perfis  where id in ('aaaaaaaa-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-00000000000b');
delete from casais  where id = '00000000-0000-4000-8000-0000000000b2';
delete from auth.users where email in ('teste.a@estlim.local','teste.b@estlim.local');

commit;
