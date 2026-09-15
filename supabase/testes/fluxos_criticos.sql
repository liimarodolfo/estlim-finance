-- ESTLIM · testes dos fluxos criticos
-- Cobre os oito itens da lista de testes minimos da especificacao tecnica, com
-- excecao do item 6 (formatos de data e hora), que vive no frontend e esta em
-- src/lib/formatters.test.ts e src/lib/masks.test.ts. Os blocos 9, 10 e 11
-- vieram depois: saldo da conta, categoria por tipo, e a fatura liquida com a
-- despesa no credito que nasce paga.
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
  v_base numeric; v_lido numeric; valor_inv numeric; st text;
  id_cartao2 uuid; id_fat2 uuid; v_venc date; v_venc2 date;
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
  insert into carteiras (casal_id, dono, tipo, nome, limite, dia_fechamento, dia_vencimento)
  values (casal,'Rodolfo','cartao','TESTE cartao', 8000, 20, 28) returning id into id_cartao;

  select l.id, l.natureza, l.tipo_valor, l.forma_ref, v.valor_caixa, v.dia_exibido, v.fatura_aberta
    into r from lancamentos l join v_lancamentos v on v.id = l.id where l.cartao_id = id_cartao;
  id_fatura := r.id;

  if id_fatura is null then raise exception 'FALHOU 2a: cartao nao gerou fatura'; end if;
  if r.natureza <> 'fixa' or r.tipo_valor <> 'variavel' then
    raise exception 'FALHOU 2b: fatura deveria nascer fixa e variavel, nasceu % e %', r.natureza, r.tipo_valor;
  end if;
  if not r.fatura_aberta or r.valor_caixa is distinct from 0 then
    raise exception 'FALHOU 2b2: a fatura deveria nascer aberta e zerada, veio % / %', r.fatura_aberta, r.valor_caixa;
  end if;
  -- A fatura debita da conta mais antiga do mesmo dono, que nem sempre e a
  -- criada por este teste: o casal ja tem contas de verdade cadastradas.
  if not exists (
    select 1 from carteiras c
     where c.id::text = r.forma_ref and c.tipo = 'conta' and c.dono = 'Rodolfo' and c.ativo
  ) then
    raise exception 'FALHOU 2c: fatura nao debita de uma conta do dono, ficou %', r.forma_ref;
  end if;
  if r.dia_exibido <> 28 then raise exception 'FALHOU 2e: dia da fatura e %, esperado 28', r.dia_exibido; end if;
  raise notice 'OK 2a-e: cartao gerou fatura fixa e variavel, aberta, debitando da conta, no dia %', r.dia_exibido;

  -- Fechar a fatura e o que define o valor dela. O usado do cartao acompanha.
  update lancamentos set valor_previsto = 2750.40 where id = id_fatura;
  select valor_caixa into v_lido from v_lancamentos where id = id_fatura;
  if v_lido <> 2750.40 then raise exception 'FALHOU 2f: fatura fechada ficou %', v_lido; end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao;
  if v_lido <> 2750.40 then raise exception 'FALHOU 2f2: usado do cartao ficou %', v_lido; end if;
  raise notice 'OK 2f: fechar a fatura define o valor dela e o usado do cartao acompanha';

  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago)
  values (id_fatura, current_date, localtime, 2750.40);
  select c.usado into v_lido from carteiras c where c.id = id_cartao;
  if v_lido <> 0 then raise exception 'FALHOU 2g: pagar a fatura nao zerou o limite, ficou %', v_lido; end if;
  raise notice 'OK 2g: a fatura paga sai da soma e o limite volta a zero';

  delete from pagamentos where lancamento_id = id_fatura;
  select c.usado into v_lido from carteiras c where c.id = id_cartao;
  if v_lido <> 2750.40 then raise exception 'FALHOU 2h: desfazer nao restaurou o limite, ficou %', v_lido; end if;
  raise notice 'OK 2h: desfazer devolve a fatura para a soma das que estao em aberto';

  -- O ciclo de outubro esta fechado, entao as parcelas do teste 3 vao para
  -- novembro sozinhas. Reabre para o bloco 3 continuar valendo o que valia.
  update lancamentos set valor_previsto = null where id = id_fatura;

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
  select count(*) into n from lancamentos l join pagamentos p on p.lancamento_id = l.id
   where l.descricao = 'TESTE geladeira';
  if n <> 5 then raise exception 'FALHOU 3e: so % das 5 parcelas no credito nasceram pagas', n; end if;
  raise notice 'OK 3c-e: parcelas no mesmo grupo, numeradas X/N, e as 5 nascem pagas no credito';

  -- ============================================================
  -- 4. AJUSTE: sem motivo falha e nao altera saldo; com motivo
  --    altera saldo e cria o lancamento.
  -- ============================================================
  select c.saldo into v_base from carteiras c where c.id = id_conta;
  begin
    perform fn_criar_ajuste(id_conta, 'entrada', 200, '   ');
    raise exception 'FALHOU 4a: aceitou ajuste sem motivo';
  exception when check_violation then
    select c.saldo into v_lido from carteiras c where c.id = id_conta;
    if v_lido <> v_base then raise exception 'FALHOU 4b: o saldo mudou mesmo sem motivo'; end if;
    raise notice 'OK 4a-b: sem motivo nao ajusta e o saldo fica intacto';
  end;

  perform fn_criar_ajuste(id_conta, 'entrada', 250.50, 'nivelamento do balanco');
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base + 250.50 then raise exception 'FALHOU 4c: saldo apos o ajuste ficou %', v_lido; end if;

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
  -- 9. SALDO DA CONTA: toda baixa que passa por uma conta move o
  --    saldo dela, e so ela. Credito e dinheiro nao encostam.
  -- ============================================================
  select c.saldo into v_base from carteiras c where c.id = id_conta;

  -- 9a. receita recebida entra na conta
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref)
  values (casal,'receita','TESTE receita na conta','fixo', 1200, current_date, 'Casal', 'pix', id_conta::text)
  returning id into id_lanc;
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_lanc, current_date, localtime, 1200, 'pix', id_conta::text);
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base + 1200 then raise exception 'FALHOU 9a: receita recebida nao entrou na conta, saldo ficou %', v_lido; end if;
  raise notice 'OK 9a: receita recebida entrou no saldo da conta';

  -- 9b. desfazer a baixa devolve
  delete from pagamentos where lancamento_id = id_lanc;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 9b: desfazer a baixa nao devolveu o saldo, ficou %', v_lido; end if;
  raise notice 'OK 9b: desfazer a baixa devolveu o saldo';

  -- 9c. despesa paga por pix sai da conta
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref, categoria_id)
  values (casal,'despesa','TESTE despesa na conta','fixo', 300, current_date, 'Casal', 'pix', id_conta::text, id_cat_fixas)
  returning id into id_lanc;
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_lanc, current_date, localtime, 300, 'pix', id_conta::text);
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base - 300 then raise exception 'FALHOU 9c: despesa paga nao saiu da conta, saldo ficou %', v_lido; end if;
  raise notice 'OK 9c: despesa paga saiu do saldo da conta';

  -- 9d. excluir o lancamento apaga a baixa em cascata e devolve o saldo
  delete from lancamentos where id = id_lanc;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 9d: excluir o lancamento pago nao devolveu o saldo, ficou %', v_lido; end if;
  raise notice 'OK 9d: excluir lancamento pago devolveu o saldo';

  -- 9e. despesa no credito nao encosta em conta nenhuma. A baixa nao e inserida
  --     aqui de proposito: desde a 0019 ela nasce sozinha, e inserir de novo
  --     bateria no unique de pagamentos.
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref, categoria_id)
  values (casal,'despesa','TESTE despesa no credito','fixo', 890, current_date, 'Casal', 'credito', id_cartao::text, id_cat_dividas)
  returning id into id_lanc;
  select count(*) into n from pagamentos where lancamento_id = id_lanc;
  if n <> 1 then raise exception 'FALHOU 9e: a despesa no credito nao nasceu paga'; end if;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 9e: despesa no credito mexeu no saldo da conta, ficou %', v_lido; end if;
  raise notice 'OK 9e: despesa no credito nasce paga e nao move saldo de conta';

  -- 9f. dinheiro: a referencia e 'Rodolfo', nao e uuid. Nao pode estourar
  --     nem mover saldo.
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref, categoria_id)
  values (casal,'despesa','TESTE despesa em dinheiro','fixo', 40, current_date, 'Rodolfo', 'dinheiro', 'Rodolfo', id_cat_fixas)
  returning id into id_lanc;
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_lanc, current_date, localtime, 40, 'dinheiro', 'Rodolfo');
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 9f: pagamento em dinheiro mexeu no saldo da conta, ficou %', v_lido; end if;
  raise notice 'OK 9f: pagamento em dinheiro nao move saldo de conta';

  -- 9g. aporte debitado da conta sai dela e entra no investimento
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento, dono, forma_metodo, forma_ref, investimento_id)
  values (casal,'investimento','TESTE aporte da conta','fixo', 700, current_date, 'Casal', 'pix', id_conta::text, id_investimento)
  returning id into id_lanc;
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_lanc, current_date, localtime, 700, 'pix', id_conta::text);
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  select valor into valor_inv from investimentos where id = id_investimento;
  if v_lido <> v_base - 700 then raise exception 'FALHOU 9g: aporte nao saiu da conta, saldo ficou %', v_lido; end if;
  if valor_inv <> 1700 then raise exception 'FALHOU 9g: aporte nao entrou no investimento, ficou %', valor_inv; end if;
  raise notice 'OK 9g: aporte saiu da conta e entrou no investimento';
  delete from pagamentos where lancamento_id = id_lanc;

  -- ============================================================
  -- 10. CATEGORIA POR TIPO: receita e despesa escolhem de listas
  --     diferentes, e 'ambas' aparece nas duas.
  -- ============================================================
  select count(*) into n from categorias
   where casal_id = casal and nome = 'Salário' and tipo = 'receita';
  if n <> 1 then raise exception 'FALHOU 10a: Salário nao esta marcada como categoria de receita'; end if;

  select count(*) into n from categorias
   where casal_id = casal and nome = 'Ajuste de saldo' and tipo = 'ambas';
  if n <> 1 then raise exception 'FALHOU 10b: Ajuste de saldo precisa servir aos dois lados'; end if;

  select count(*) into n from categorias
   where casal_id = casal and tipo in ('receita','ambas') and nome not in ('Investimentos','Ajuste de saldo');
  if n = 0 then raise exception 'FALHOU 10c: nenhuma categoria sobrou para o cadastro de receita'; end if;
  raise notice 'OK 10: categorias separadas por tipo';

  -- ============================================================
  -- 11. A FATURA ACUMULA, FECHA, E O EXCEDENTE VIRA GASTO DO CARTAO
  --     Aberta, ela vale a soma das compras do ciclo. Fechada, vale o
  --     valor confirmado, e o que passa da soma e o que entrou nela
  --     sem ter sido lancado em detalhe.
  -- ============================================================
  v_venc := private.fn_data_no_mes(
    extract(year from current_date)::int, extract(month from current_date)::int, 12);

  -- Fecha dia 5, vence dia 12. O usado NAO e digitado: ele e derivado.
  insert into carteiras (casal_id, dono, tipo, nome, limite, dia_fechamento, dia_vencimento)
  values (casal,'Rodolfo','cartao','TESTE cartao liquido', 8000, 5, 12) returning id into id_cartao2;
  select id into id_fat2 from lancamentos where cartao_id = id_cartao2;
  select c.saldo into v_base from carteiras c where c.id = id_conta;

  -- 11a. a fatura nasce aberta e vazia
  select valor_caixa, valor_exibido, fatura_aberta, itens_no_ciclo into r
    from v_lancamentos where id = id_fat2;
  if not r.fatura_aberta then raise exception 'FALHOU 11a: fatura nova nao nasceu aberta'; end if;
  if r.valor_caixa is distinct from 0 or r.itens_no_ciclo <> 0 then
    raise exception 'FALHOU 11a: fatura nova veio com % e % itens', r.valor_caixa, r.itens_no_ciclo;
  end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao2;
  if v_lido <> 0 then raise exception 'FALHOU 11a: usado do cartao novo ficou %', v_lido; end if;

  -- 11b. a despesa no credito nasce paga e a fatura acumula sozinha
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto,
                           data_emissao, data_vencimento, dono, forma_metodo, forma_ref)
  values (casal,'despesa','TESTE compra liquida','fixo', 300, current_date, v_venc,
          'Casal','credito', id_cartao2::text)
  returning id into id_lanc;
  select l.status, p.forma_metodo, p.forma_ref, p.valor_pago into r
    from lancamentos l join pagamentos p on p.lancamento_id = l.id where l.id = id_lanc;
  if r.status <> 'pago' then raise exception 'FALHOU 11b: status ficou %', r.status; end if;
  if r.forma_metodo <> 'credito' or r.forma_ref <> id_cartao2::text then
    raise exception 'FALHOU 11b: a baixa nao aponta para o cartao';
  end if;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 11b: a conta se moveu, ficou %', v_lido; end if;

  select valor_caixa, valor_detalhado, valor_exibido, itens_no_ciclo into r
    from v_lancamentos where id = id_fat2;
  if r.valor_caixa is distinct from 300 then raise exception 'FALHOU 11b: acumulado ficou %', r.valor_caixa; end if;
  if r.itens_no_ciclo <> 1 then raise exception 'FALHOU 11b: itens %', r.itens_no_ciclo; end if;
  if r.valor_exibido is distinct from 0 then
    raise exception 'FALHOU 11b: fatura aberta nao pode ter excedente, veio %', r.valor_exibido;
  end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao2;
  if v_lido <> 300 then raise exception 'FALHOU 11b: usado derivado ficou %', v_lido; end if;
  raise notice 'OK 11a-b: fatura nasce aberta, a compra nasce paga e a fatura acumula sozinha';

  -- 11c. despesa de outro mes ou de outro cartao nao entra nesta fatura
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento,
                           dono, forma_metodo, forma_ref)
  values (casal,'despesa','TESTE outro mes','fixo', 400,
          (date_trunc('month', current_date) + interval '2 month')::date,
          'Casal','credito', id_cartao2::text);
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento,
                           dono, forma_metodo, forma_ref)
  values (casal,'despesa','TESTE outro cartao','fixo', 250, v_venc,'Casal','credito', id_cartao::text);
  select valor_caixa into v_lido from v_lancamentos where id = id_fat2;
  if v_lido is distinct from 300 then raise exception 'FALHOU 11c: entrou o que nao era do ciclo, ficou %', v_lido; end if;
  raise notice 'OK 11c: so o mesmo cartao e o mesmo ciclo entram na fatura';

  -- 11d. fechar abaixo do que ja foi lancado e recusado
  begin
    update lancamentos set valor_previsto = 250 where id = id_fat2;
    raise exception 'FALHOU 11d: aceitou fechar a fatura abaixo das compras dela';
  exception when check_violation then raise notice 'OK 11d: fatura so fecha do acumulado para cima'; end;

  -- 11e. fechada em 1000, o excedente de 700 vira o gasto do cartao
  update lancamentos set valor_previsto = 1000 where id = id_fat2;
  select valor_caixa, valor_detalhado, valor_exibido, fatura_aberta into r
    from v_lancamentos where id = id_fat2;
  if r.valor_caixa is distinct from 1000 then raise exception 'FALHOU 11e: caixa %', r.valor_caixa; end if;
  if r.valor_detalhado is distinct from 300 then raise exception 'FALHOU 11e: detalhado %', r.valor_detalhado; end if;
  if r.valor_exibido is distinct from 700 then raise exception 'FALHOU 11e: excedente %', r.valor_exibido; end if;
  if r.fatura_aberta then raise exception 'FALHOU 11e: continua marcada como aberta'; end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao2;
  if v_lido <> 1000 then raise exception 'FALHOU 11e: usado apos fechar ficou %', v_lido; end if;
  raise notice 'OK 11e: fatura fechada em 1000 com 300 em detalhe deixa 700 de gasto do cartao';

  -- 11f. o ciclo fechado nao recebe compra nova: ela vai para o proximo
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
  perform fn_criar_lancamentos('despesa','TESTE apos fechar',null,'avulsa','fixo', 90,
    date_trunc('month', current_date)::date, date_trunc('month', current_date)::date,
    null, 'credito', id_cartao2::text, 'Casal');
  perform set_config('role','postgres',true);

  select data_vencimento into v_venc2 from lancamentos where descricao = 'TESTE apos fechar';
  if date_trunc('month', v_venc2) <= date_trunc('month', current_date) then
    raise exception 'FALHOU 11f: compra em ciclo fechado ficou em %', v_venc2;
  end if;
  select valor_exibido into v_lido from v_lancamentos where id = id_fat2;
  if v_lido is distinct from 700 then raise exception 'FALHOU 11f: a fatura fechada mudou, ficou %', v_lido; end if;
  raise notice 'OK 11f: ciclo fechado empurra a compra nova para a fatura seguinte';

  -- 11g. o dia de fechamento decide o ciclo de uma compra nova
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
  perform fn_criar_lancamentos('despesa','TESTE antes do fechamento',null,'avulsa','fixo', 30,
    date '2027-03-03', date '2027-03-03', null, 'credito', id_cartao2::text, 'Casal');
  perform fn_criar_lancamentos('despesa','TESTE depois do fechamento',null,'avulsa','fixo', 30,
    date '2027-03-20', date '2027-03-20', null, 'credito', id_cartao2::text, 'Casal');
  perform set_config('role','postgres',true);

  select data_vencimento into v_venc2 from lancamentos where descricao = 'TESTE antes do fechamento';
  if v_venc2 <> date '2027-03-12' then raise exception 'FALHOU 11g: compra do dia 3 foi para %', v_venc2; end if;
  select data_vencimento into v_venc2 from lancamentos where descricao = 'TESTE depois do fechamento';
  if v_venc2 <> date '2027-04-12' then raise exception 'FALHOU 11g: compra do dia 20 foi para %', v_venc2; end if;
  raise notice 'OK 11g: o dia de fechamento do cartao decide em qual fatura a compra cai';

  -- 11h. no credito sem valor nao nasce baixa, e ela aparece quando o valor chega
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento,
                           dono, forma_metodo, forma_ref)
  values (casal,'despesa','TESTE credito variavel','variavel', null,
          (date_trunc('month', current_date) + interval '1 month' + interval '11 day')::date,
          'Casal','credito', id_cartao2::text)
  returning id into id_lanc;
  if exists (select 1 from pagamentos where lancamento_id = id_lanc) then
    raise exception 'FALHOU 11h: nasceu baixa sem valor';
  end if;
  update lancamentos set valor_previsto = 220 where id = id_lanc;
  select p.valor_pago, l.status into r
    from pagamentos p join lancamentos l on l.id = p.lancamento_id where p.lancamento_id = id_lanc;
  if r.valor_pago is distinct from 220 or r.status <> 'pago' then
    raise exception 'FALHOU 11h: ao ganhar valor a baixa saiu % / %', r.valor_pago, r.status;
  end if;

  -- 11i. sair do credito apaga a baixa automatica e devolve o status
  update lancamentos set forma_metodo = 'pix', forma_ref = id_conta::text where id = id_lanc;
  if exists (select 1 from pagamentos where lancamento_id = id_lanc) then
    raise exception 'FALHOU 11i: a baixa automatica sobreviveu a troca de forma';
  end if;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 11i: a conta se moveu, ficou %', v_lido; end if;
  delete from lancamentos where id = id_lanc;
  raise notice 'OK 11h-i: valor variavel no credito, e a troca de forma desfaz a baixa';

  -- 11j. pagar a fatura sai pelo CHEIO da conta, mas o balanco so conta o excedente
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_fat2, current_date, localtime, 1000, 'debito', id_conta::text);
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base - 1000 then raise exception 'FALHOU 11j: conta ficou %, esperado %', v_lido, v_base - 1000; end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao2;
  if v_lido <> 0 then raise exception 'FALHOU 11j: o cartao nao zerou, ficou %', v_lido; end if;
  select valor_caixa, valor_exibido, valor_realizado into r from v_lancamentos where id = id_fat2;
  if r.valor_caixa is distinct from 1000 then raise exception 'FALHOU 11j: caixa apos pagar %', r.valor_caixa; end if;
  if r.valor_exibido is distinct from 700 then raise exception 'FALHOU 11j: excedente apos pagar %', r.valor_exibido; end if;
  if r.valor_realizado is distinct from 700 then raise exception 'FALHOU 11j: realizado %', r.valor_realizado; end if;
  raise notice 'OK 11j: a fatura sai cheia do caixa e entra so pelo excedente no balanco';

  -- 11k. desfazer devolve conta, limite e o excedente
  delete from pagamentos where lancamento_id = id_fat2;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 11k: conta ficou %', v_lido; end if;
  select c.usado into v_lido from carteiras c where c.id = id_cartao2;
  if v_lido <> 1000 then raise exception 'FALHOU 11k: usado ficou %', v_lido; end if;
  select valor_exibido into v_lido from v_lancamentos where id = id_fat2;
  if v_lido is distinct from 700 then raise exception 'FALHOU 11k: excedente ficou %', v_lido; end if;
  raise notice 'OK 11k: desfazer a fatura devolve saldo, limite e o excedente';

  -- 11l. excluir lancamento pago devolve o saldo. Em receita o sinal se invertia
  --      e o valor era somado de novo, dobrando o saldo.
  insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento,
                           dono, forma_metodo, forma_ref)
  values (casal,'receita','TESTE receita excluida','fixo', 500, current_date,'Casal','pix', id_conta::text)
  returning id into id_lanc;
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_lanc, current_date, localtime, 500, 'pix', id_conta::text);
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base + 500 then raise exception 'FALHOU 11l: baixa da receita deu %', v_lido; end if;
  delete from lancamentos where id = id_lanc;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 11l: excluir receita paga deixou o saldo em %', v_lido; end if;

  -- 11m. e excluir a fatura paga devolve o limite do cartao
  insert into pagamentos (lancamento_id, data_pagamento, hora_pagamento, valor_pago, forma_metodo, forma_ref)
  values (id_fat2, current_date, localtime, 1000, 'debito', id_conta::text);
  delete from lancamentos where id = id_fat2;
  select c.saldo into v_lido from carteiras c where c.id = id_conta;
  if v_lido <> v_base then raise exception 'FALHOU 11m: saldo apos excluir a fatura ficou %', v_lido; end if;
  raise notice 'OK 11l-m: excluir pago devolve saldo e limite, inclusive em receita';

  -- 11n. receita no credito e barrada pelo schema
  begin
    insert into lancamentos (casal_id, tipo, descricao, tipo_valor, valor_previsto, data_vencimento,
                             dono, forma_metodo, forma_ref)
    values (casal,'receita','TESTE receita no credito','fixo', 100, current_date,
            'Casal','credito', id_cartao2::text);
    raise exception 'FALHOU 11n: aceitou receita no credito';
  exception when check_violation then raise notice 'OK 11n: receita no credito recusada pelo schema'; end;

  -- 11o. fixa no credito de valor variavel passa pela virada sem estourar o
  --      not null de valor_pago, que derrubaria o cron de todos os casais
  insert into lancamentos (casal_id, tipo, descricao, natureza, tipo_valor, valor_previsto,
                           data_vencimento, dono, forma_metodo, forma_ref)
  values (casal,'despesa','TESTE assinatura','fixa','variavel', null,
          (date_trunc('month', current_date) - interval '1 month' + interval '11 day')::date,
          'Casal','credito', id_cartao2::text);
  perform private.fn_virada_mes();
  raise notice 'OK 11o: a virada aguenta fixa no credito sem valor';

  delete from pagamentos where lancamento_id in (select id from lancamentos where descricao like 'TESTE %');
  delete from lancamentos where descricao like 'TESTE %' or cartao_id = id_cartao2;
  delete from carteiras where id = id_cartao2;

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
