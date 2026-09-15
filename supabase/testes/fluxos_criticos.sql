-- ESTLIM · testes dos fluxos criticos
-- Cobre os oito itens da lista de testes minimos da especificacao tecnica, com
-- excecao do item 6 (formatos de data e hora), que vive no frontend e esta em
-- src/lib/formatters.test.ts e src/lib/masks.test.ts.
--
-- Como rodar: SQL Editor do painel do Supabase, com o papel de servico.
-- Tudo o que o teste cria e apagado no fim. Se algum passo falhar, a excecao
-- sobe com a palavra FALHOU e a transacao inteira e desfeita.

begin;

do $$
declare
  casal uuid := '00000000-0000-4000-8000-000000000001';
  uid uuid;
  id_conta uuid; id_cartao uuid; id_corretora uuid; id_investimento uuid;
  id_cat_dividas uuid; id_cat_fixas uuid; id_lanc uuid; id_fatura uuid;
  saldo numeric; usado numeric; valor_inv numeric; st text;
  n int; datas text; resultado text; r record;
begin
  select id into uid from auth.users where email = 'rodolfo@rliima.com';
  if uid is null then
    raise exception 'FALHOU: rodolfo@rliima.com nao existe. Os testes precisam de um perfil de verdade.';
  end if;
  select id into id_cat_dividas from categorias where casal_id = casal and nome = 'Dívidas e parcelas';
  select id into id_cat_fixas   from categorias where casal_id = casal and nome = 'Contas fixas';

  insert into carteiras (casal_id, dono, tipo, nome, saldo)
  values (casal,'Rodolfo','conta','TESTE conta', 5000) returning id into id_conta;

  -- ============================================================
  -- 2. FATURA: criar cartao gera fatura, valor acompanha o usado,
  --    pagar zera o limite e desfazer restaura.
  -- ============================================================
  insert into carteiras (casal_id, dono, tipo, nome, limite, usado, dia_fechamento, dia_vencimento)
  values (casal,'Rodolfo','cartao','TESTE cartao', 8000, 1500, 20, 28) returning id into id_cartao;

  select l.id, l.natureza, l.tipo_valor, l.forma_ref, v.valor_exibido, v.dia_exibido
    into r from lancamentos l join v_lancamentos v on v.id = l.id where l.cartao_id = id_cartao;
  id_fatura := r.id;

  if id_fatura is null then raise exception 'FALHOU 2a: cartao nao gerou fatura'; end if;
  if r.natureza <> 'fixa' or r.tipo_valor <> 'variavel' then
    raise exception 'FALHOU 2b: fatura deveria nascer fixa e variavel, nasceu % e %', r.natureza, r.tipo_valor;
  end if;
  if r.forma_ref <> id_conta::text then raise exception 'FALHOU 2c: fatura nao debita da conta do dono'; end if;
  if r.valor_exibido <> 1500 then raise exception 'FALHOU 2d: valor da fatura e %, esperado 1500', r.valor_exibido; end if;
  if r.dia_exibido <> 28 then raise exception 'FALHOU 2e: dia da fatura e %, esperado 28', r.dia_exibido; end if;
  raise notice 'OK 2a-e: cartao gerou fatura fixa variavel, debitando da conta, valor % no dia %', r.valor_exibido, r.dia_exibido;

  update carteiras set usado = 2750.40 where id = id_cartao;
  select valor_exibido into usado from v_lancamentos where id = id_fatura;
  if usado <> 2750.40 then raise exception 'FALHOU 2f: fatura nao acompanhou o usado, ficou %', usado; end if;
  raise notice 'OK 2f: o valor da fatura acompanha o limite utilizado sozinho';

  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago)
  values (id_fatura, current_date, localtime, 2750.40);
  select usado into usado from carteiras where id = id_cartao;
  if usado <> 0 then raise exception 'FALHOU 2g: pagar a fatura nao zerou o limite, ficou %', usado; end if;
  raise notice 'OK 2g: pagar a fatura zerou o limite utilizado';

  delete from pagamentos where lancamento_id = id_fatura;
  select usado into usado from carteiras where id = id_cartao;
  if usado <> 2750.40 then raise exception 'FALHOU 2h: desfazer nao restaurou o limite, ficou %', usado; end if;
  raise notice 'OK 2h: desfazer a baixa restaurou o limite pelo valor pago';

  -- ============================================================
  -- 1. BAIXA COM TIMESTAMP: a baixa grava data e hora.
  -- ============================================================
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, categoria_id)
  values (casal,'despesa','TESTE internet','fixo', 120, current_date, 'Casal', id_cat_fixas)
  returning id into id_lanc;

  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, confirmado_por)
  values (id_lanc, current_date, localtime, 120, uid);

  select p.data_pagamento, p.hora_pagamento, l.status into r
    from pagamentos p join lancamentos l on l.id = p.lancamento_id where p.lancamento_id = id_lanc;
  if r.data_pagamento is null or r.hora_pagamento is null then
    raise exception 'FALHOU 1a: a baixa nao gravou data e hora';
  end if;
  if r.status <> 'pago' then raise exception 'FALHOU 1b: o status nao virou pago'; end if;
  raise notice 'OK 1: baixa gravou data % e hora %, e o status virou pago', r.data_pagamento, r.hora_pagamento;

  delete from pagamentos where lancamento_id = id_lanc;
  select status into st from lancamentos where id = id_lanc;
  if st = 'pago' then raise exception 'FALHOU 1c: desfazer nao tirou o status de pago'; end if;
  raise notice 'OK 1c: desfazer recalculou o status para %', st;

  -- ============================================================
  -- 3. PARCELAS: N lancamentos numerados, dia do cartao no credito,
  --    cruzando a virada de ano.
  -- ============================================================
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);

  perform fn_criar_lancamentos(
    'despesa','TESTE geladeira','Casas Bahia','parcelada','fixo', 890,
    current_date, date '2026-11-05', id_cat_dividas, 'credito', id_cartao::text, 'Casal', null, 5);

  perform set_config('role','postgres',true);

  select count(*), string_agg(to_char(data_vencimento,'DD/MM/YYYY'), ' | ' order by parcela_atual)
    into n, datas from lancamentos where descricao = 'TESTE geladeira';
  if n <> 5 then raise exception 'FALHOU 3a: gerou % parcelas, esperado 5', n; end if;
  if datas <> '28/11/2026 | 28/12/2026 | 28/01/2027 | 28/02/2027 | 28/03/2027' then
    raise exception 'FALHOU 3b: vencimentos saíram %', datas;
  end if;
  raise notice 'OK 3a-b: 5 parcelas no dia do cartao, cruzando o ano: %', datas;

  select count(distinct grupo_parcelas) into n from lancamentos where descricao = 'TESTE geladeira';
  if n <> 1 then raise exception 'FALHOU 3c: as parcelas nao ficaram no mesmo grupo'; end if;
  select parcela_atual, parcela_total into r from lancamentos where descricao = 'TESTE geladeira' and parcela_atual = 3;
  if r.parcela_total <> 5 then raise exception 'FALHOU 3d: numeracao X/N errada'; end if;
  raise notice 'OK 3c-d: parcelas no mesmo grupo e numeradas X/N';

  -- ============================================================
  -- 4. AJUSTE: sem motivo falha e nao altera saldo; com motivo
  --    altera saldo e cria o lancamento.
  -- ============================================================
  select saldo into saldo from carteiras where id = id_conta;
  begin
    perform fn_criar_ajuste(id_conta, 'entrada', 200, '   ');
    raise exception 'FALHOU 4a: aceitou ajuste sem motivo';
  exception when check_violation then
    select saldo into usado from carteiras where id = id_conta;
    if usado <> saldo then raise exception 'FALHOU 4b: o saldo mudou mesmo sem motivo'; end if;
    raise notice 'OK 4a-b: sem motivo nao ajusta e o saldo fica intacto';
  end;

  perform fn_criar_ajuste(id_conta, 'entrada', 250.50, 'nivelamento do balanco');
  select saldo into usado from carteiras where id = id_conta;
  if usado <> saldo + 250.50 then raise exception 'FALHOU 4c: saldo apos o ajuste ficou %', usado; end if;

  select l.status, l.tipo, c.nome as categoria, p.hora_pagamento is not null as tem_hora into r
    from ajustes a
    join lancamentos l on l.id = a.lancamento_id
    join pagamentos p on p.lancamento_id = l.id
    left join categorias c on c.id = l.categoria_id
   where a.carteira_id = id_conta;
  if r.status <> 'pago' or r.categoria <> 'Ajuste de saldo' or not r.tem_hora then
    raise exception 'FALHOU 4d: o lancamento espelho saiu errado';
  end if;
  raise notice 'OK 4c-d: ajuste moveu o saldo e criou lancamento pago em Ajuste de saldo, com hora';

  -- ============================================================
  -- 7. APORTE: marcar como aplicado soma ao investimento de
  --    destino, desfazer subtrai, e aporte nao e despesa.
  -- ============================================================
  insert into corretoras (casal_id, nome) values (casal, 'TESTE corretora') returning id into id_corretora;
  insert into investimentos (casal_id, sub, nome, valor, instituicao_tipo, corretora_id, dono)
  values (casal,'ativo','TESTE ativo', 1000, 'corretora', id_corretora, 'Casal') returning id into id_investimento;

  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref, investimento_id)
  values (casal,'investimento','TESTE aporte','fixo', 500, current_date, 'Casal', 'pix', id_conta::text, id_investimento)
  returning id into id_lanc;

  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago)
  values (id_lanc, current_date, localtime, 500);
  select valor into valor_inv from investimentos where id = id_investimento;
  if valor_inv <> 1500 then raise exception 'FALHOU 7a: aporte nao somou, investimento ficou %', valor_inv; end if;
  raise notice 'OK 7a: aporte aplicado somou ao investimento de destino';

  delete from pagamentos where lancamento_id = id_lanc;
  select valor into valor_inv from investimentos where id = id_investimento;
  if valor_inv <> 1000 then raise exception 'FALHOU 7b: desfazer nao subtraiu, ficou %', valor_inv; end if;
  raise notice 'OK 7b: desfazer o aporte subtraiu de volta';

  select count(*) into n from lancamentos where descricao = 'TESTE aporte' and tipo = 'despesa';
  if n <> 0 then raise exception 'FALHOU 7c: aporte esta contando como despesa'; end if;
  raise notice 'OK 7c: aporte e tipo investimento, nao entra nas despesas';

  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo)
    values (casal,'investimento','TESTE aporte no credito','fixo', 100, current_date,'Casal','credito');
    raise exception 'FALHOU 7d: aceitou aporte no credito';
  exception when check_violation then raise notice 'OK 7d: aporte no credito recusado pelo schema'; end;

  -- ============================================================
  -- 8. INVESTIMENTO: banco e corretora nunca juntos, e corretora
  --    com investimento vinculado nao sai.
  -- ============================================================
  begin
    insert into investimentos (casal_id, sub, nome, instituicao_tipo, carteira_id, corretora_id, dono)
    values (casal,'caixinha','TESTE invalido','corretora', id_conta, id_corretora, 'Casal');
    raise exception 'FALHOU 8a: aceitou banco e corretora no mesmo investimento';
  exception when check_violation then raise notice 'OK 8a: chk_instituicao barrou banco com corretora'; end;

  begin
    perform fn_excluir_corretora(id_corretora);
    raise exception 'FALHOU 8b: excluiu corretora com investimento vinculado';
  exception when foreign_key_violation then raise notice 'OK 8b: corretora com investimento nao pode ser excluida'; end;

  -- ============================================================
  -- 5. LANCAMENTO VARIAVEL PODE EXISTIR SEM VALOR.
  -- ============================================================
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, data_vencimento, dono, categoria_id)
  values (casal,'despesa','TESTE energia','variavel', current_date, 'Casal', id_cat_fixas);
  raise notice 'OK 5a: lancamento variavel aceito sem valor';

  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, data_vencimento, dono, categoria_id)
    values (casal,'despesa','TESTE fixo sem valor','fixo', current_date, 'Casal', id_cat_fixas);
    raise exception 'FALHOU 5b: aceitou lancamento de valor fixo sem valor';
  exception when check_violation then raise notice 'OK 5b: valor fixo sem valor recusado'; end;

  -- ============================================================
  -- CATEGORIA DE SISTEMA E EXCLUSAO DE CARTEIRA
  -- ============================================================
  begin
    delete from categorias where casal_id = casal and nome = 'Ajuste de saldo';
    raise exception 'FALHOU: excluiu categoria do sistema';
  exception when check_violation then raise notice 'OK: categoria do sistema nao pode ser excluida'; end;

  resultado := fn_excluir_carteira(id_conta);
  if resultado <> 'arquivada' then
    raise exception 'FALHOU: conta com historico foi % em vez de arquivada', resultado;
  end if;
  raise notice 'OK: conta com historico foi arquivada, preservando o historico';

  -- ============================================================
  -- LIMPEZA
  -- ============================================================
  delete from pagamentos where lancamento_id in (select id from lancamentos where descricao like 'TESTE %');
  delete from pagamentos where lancamento_id in (select lancamento_id from ajustes where carteira_id = id_conta);
  delete from ajustes where carteira_id = id_conta;
  delete from lancamentos where descricao like 'TESTE %' or descricao like 'Ajuste: nivelamento do balanco%';
  delete from lancamentos where cartao_id = id_cartao;
  delete from investimentos where id = id_investimento;
  delete from corretoras where id = id_corretora;
  delete from carteiras where id in (id_cartao, id_conta);

  raise notice '=== TODOS OS FLUXOS CRITICOS PASSARAM ===';
end $$;

-- ============================================================
-- 5. RLS: usuario de um casal nao le linha de outro.
--    Esta parte esta em testes/rls_e_restricoes.sql, porque precisa
--    criar um segundo casal e dois usuarios.
-- ============================================================

commit;
