-- ESTLIM · o app avisa o outro quando alguem mexe no dinheiro
--
-- Ate aqui o push so falava uma vez por dia, pelo cron, com o que estava por
-- vencer. Esta migration acrescenta o aviso de evento: alguem lancou uma
-- despesa, alguem recebeu uma receita, alguem deu baixa em alguma coisa.
--
-- A regra que organiza tudo: o aviso vai para o OUTRO. Quem acabou de cadastrar
-- ja sabe o que cadastrou, e receber de volta a propria acao e o caminho mais
-- rapido para a pessoa desligar a notificacao.
--
-- Isso tambem define o que NAO avisa. Sem usuario logado quem escreveu foi o
-- cron, e a virada de mes replica dezenas de linhas de uma vez. Um lote desses
-- as 00h10 nao e aviso, e despertador.

-- ============================================================
-- 1. O CARTEIRO
-- ============================================================
-- Monta a lista de destinatarios e entrega para a Edge Function. Nunca levanta
-- excecao: uma notificacao que falha nao pode derrubar o insert que a originou,
-- porque o lancamento e o fato e o aviso e so o recado.
create or replace function private.fn_push_para(
  p_casal   uuid,
  p_autor   uuid,
  p_titulo  text,
  p_corpo   text,
  p_tag     text,
  p_caminho text default '/lancamentos'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_perfis uuid[];
  v_url    text;
  v_token  text;
begin
  select array_agg(distinct a.perfil_id) into v_perfis
    from assinaturas_push a
   where a.casal_id = p_casal
     and a.perfil_id is distinct from p_autor
     and a.falhas < 5;

  -- Ninguem do outro lado tem aparelho assinado: nao ha o que entregar, e nao
  -- vale gastar uma chamada HTTP para descobrir isso la na frente.
  if v_perfis is null then return; end if;

  select decrypted_secret into v_url   from vault.decrypted_secrets where name = 'url_push';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'token_cron_push';
  if v_url is null or v_token is null then
    raise warning 'aviso nao enviado: falta url_push ou token_cron_push no Vault';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := jsonb_build_object(
      'para_perfis', to_jsonb(v_perfis),
      'titulo',  p_titulo,
      'corpo',   p_corpo,
      'tag',     p_tag,
      'caminho', p_caminho
    ),
    timeout_milliseconds := 20000
  );
exception when others then
  raise warning 'aviso nao enviado: %', sqlerrm;
end $$;

revoke all on function private.fn_push_para(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;

-- ============================================================
-- 2. LANCAMENTO NOVO
-- ============================================================
create or replace function private.fn_avisar_lancamento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_autor  uuid := auth.uid();
  v_quem   text;
  v_titulo text;
  v_valor  text;
begin
  -- Escrita sem usuario logado e escrita do sistema: virada de mes, seed,
  -- correcao pelo SQL Editor. Nada disso e alguem avisando alguem.
  if v_autor is null then return null; end if;

  -- A fatura nasce junto com o cartao, por gatilho. Nao foi uma decisao de
  -- gasto, foi o sistema abrindo a conta onde os gastos vao cair.
  if new.cartao_id is not null then return null; end if;

  -- Compra em 5x vira 5 linhas no mesmo instante. Avisa uma vez, dizendo 5x.
  if coalesce(new.parcela_atual, 1) > 1 then return null; end if;

  select nome into v_quem from perfis where id = v_autor;

  v_titulo := case new.tipo
    when 'receita'      then 'Nova receita adicionada'
    when 'investimento' then 'Novo aporte adicionado'
    else                     'Nova despesa adicionada'
  end;

  -- Lancamento de valor variavel nasce sem valor de proposito, com o selo
  -- "Adicionar valor". O aviso diz isso em vez de mentir um R$ 0,00.
  v_valor := case
    when new.valor_previsto is null then 'valor a definir'
    else private.fn_moeda_br(new.valor_previsto)
  end;

  perform private.fn_push_para(
    new.casal_id,
    v_autor,
    v_titulo,
    new.descricao || ' · ' || v_valor
      || case when coalesce(new.parcela_total, 1) > 1
              then ' em ' || new.parcela_total || 'x' else '' end
      || coalesce(' · por ' || v_quem, ''),
    'novo-' || new.id,
    '/lancamentos'
  );

  return null;
exception when others then
  raise warning 'aviso de lancamento nao enviado: %', sqlerrm;
  return null;
end $$;

drop trigger if exists trg_avisar_lancamento on lancamentos;
create trigger trg_avisar_lancamento
  after insert on lancamentos
  for each row execute function private.fn_avisar_lancamento();

-- ============================================================
-- 3. BAIXA
-- ============================================================
create or replace function private.fn_avisar_baixa()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_autor uuid := auth.uid();
  v_lanc  lancamentos%rowtype;
  v_quem  text;
  v_titulo text;
begin
  if v_autor is null then return null; end if;

  select * into v_lanc from lancamentos where id = new.lancamento_id;
  if v_lanc.id is null then return null; end if;

  -- Baixa que nasce junto do lancamento nao ganha aviso proprio. Sao tres
  -- casos, e nos tres o aviso de "novo lancamento" acabou de sair no mesmo
  -- instante: a despesa no credito, que nasce paga pela operadora; o ajuste de
  -- saldo; e o check "ja foi paga" do cadastro. Dois avisos para um ato so e
  -- ruido. A comparacao e com now(), que dentro da transacao nao anda, entao o
  -- que ela pergunta de verdade e "isto veio no mesmo ato?".
  if now() - v_lanc.criado_em < interval '2 seconds' then return null; end if;

  select nome into v_quem from perfis where id = v_autor;

  v_titulo := case
    when v_lanc.cartao_id is not null   then 'Fatura paga'
    when v_lanc.tipo = 'receita'        then 'Receita recebida'
    when v_lanc.tipo = 'investimento'   then 'Aporte aplicado'
    else                                     'Conta paga'
  end;

  perform private.fn_push_para(
    v_lanc.casal_id,
    v_autor,
    v_titulo,
    v_lanc.descricao || ' · ' || private.fn_moeda_br(new.valor_pago)
      || coalesce(' · por ' || v_quem, ''),
    'baixa-' || new.id,
    '/lancamentos'
  );

  return null;
exception when others then
  raise warning 'aviso de baixa nao enviado: %', sqlerrm;
  return null;
end $$;

-- O nome comeca com "trg_a" para rodar antes dos outros gatilhos de pagamentos,
-- que executam em ordem alfabetica. Ele so le, entao a posicao nao muda o
-- resultado, mas le o lancamento antes de trg_status_do_pagamento mexer nele.
drop trigger if exists trg_avisar_baixa on pagamentos;
create trigger trg_avisar_baixa
  after insert on pagamentos
  for each row execute function private.fn_avisar_baixa();
