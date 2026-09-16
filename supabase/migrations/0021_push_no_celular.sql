-- ESTLIM · notificacao no celular, com o app fechado
--
-- O sino da topbar so fala com o app aberto. Push de verdade precisa de quatro
-- pecas: um aparelho assinado, uma chave para assinar a mensagem, alguem que
-- envie, e um relogio que dispare. Esta migration monta as quatro.
--
-- SOBRE O iOS
-- No iPhone e no iPad, push so funciona com o app instalado na tela de inicio,
-- do iOS 16.4 em diante. No Safari em aba a API nem existe. E nao ha
-- agendamento local: quem dispara "vence amanha" e o servidor, por isso o cron.

create extension if not exists pg_net with schema extensions;

-- ============================================================
-- 1. OS APARELHOS ASSINADOS
-- ============================================================
-- O endpoint e a URL que o servico de push do fabricante (Apple, Google,
-- Mozilla) da para aquele aparelho. E unico, e morre quando o app e
-- desinstalado ou a permissao e revogada.
create table assinaturas_push (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  perfil_id uuid not null references perfis(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  criado_em timestamptz not null default now(),
  falhas int not null default 0
);

create index assinaturas_push_casal_idx on assinaturas_push (casal_id);

alter table assinaturas_push enable row level security;

-- Cada um cuida so das proprias assinaturas. A Edge Function le com a chave de
-- servico, que passa por cima do RLS.
create policy assinaturas_push_sel on assinaturas_push for select to authenticated
  using (perfil_id = auth.uid());
create policy assinaturas_push_ins on assinaturas_push for insert to authenticated
  with check (perfil_id = auth.uid() and casal_id = private.meu_casal());
create policy assinaturas_push_upd on assinaturas_push for update to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy assinaturas_push_del on assinaturas_push for delete to authenticated
  using (perfil_id = auth.uid());

-- ============================================================
-- 2. OS SEGREDOS, NO VAULT
-- ============================================================
-- A chave privada VAPID, o token que o cron usa para falar com a Edge Function,
-- e o endereco dela. Nada disso fica em coluna comum nem no codigo do app.
-- As funcoes que leem sao negadas a anon e authenticated de proposito: so a
-- chave de servico, que e o que a Edge Function usa, consegue executar.
--
-- Os valores reais foram criados uma vez pelo MCP e vivem so no Vault do
-- projeto. Aqui ficam mascarados, porque migration versionada vai para o
-- GitHub:
--   vault.create_secret('<chave privada VAPID>', 'vapid_private',   ...)
--   vault.create_secret('<token aleatorio>',     'token_cron_push', ...)
--   vault.create_secret('<url da Edge Function>','url_push',        ...)

create or replace function fn_chave_push()
returns text language sql security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private'
$$;
revoke all on function fn_chave_push() from public, anon, authenticated;
grant execute on function fn_chave_push() to service_role;

create or replace function fn_token_cron_push()
returns text language sql security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'token_cron_push'
$$;
revoke all on function fn_token_cron_push() from public, anon, authenticated;
grant execute on function fn_token_cron_push() to service_role;

-- ============================================================
-- 3. OS AVISOS DO DIA
-- ============================================================
-- Agrupa por tipo: tres contas vencendo amanha viram uma notificacao, nao tres.
-- Senao vira spam e o usuario desliga tudo.
--
-- Os dois perfis do casal recebem os mesmos avisos: o app e de casal, e os dois
-- administram. O dono do lancamento diz de quem e a despesa, nao quem cuida.
create or replace function fn_avisos_para_push()
returns table (
  endpoint text, p256dh text, auth text,
  titulo text, corpo text, tag text, caminho text
)
language sql security definer set search_path = public as $$
  with avisos as (
    select l.casal_id, 'vence-amanha' as tag, count(*) as qtd,
           sum(coalesce(v.valor_caixa, 0)) as total, min(l.descricao) as primeira
      from lancamentos l join v_lancamentos v on v.id = l.id
     where l.tipo = 'despesa' and l.status <> 'pago'
       and l.data_vencimento = current_date + 1
     group by l.casal_id
    union all
    select l.casal_id, 'vence-hoje', count(*),
           sum(coalesce(v.valor_caixa, 0)), min(l.descricao)
      from lancamentos l join v_lancamentos v on v.id = l.id
     where l.tipo = 'despesa' and l.status <> 'pago'
       and l.data_vencimento = current_date
     group by l.casal_id
    union all
    -- So no dia seguinte ao vencimento, senao repete todo dia para sempre.
    select l.casal_id, 'atrasou', count(*),
           sum(coalesce(v.valor_caixa, 0)), min(l.descricao)
      from lancamentos l join v_lancamentos v on v.id = l.id
     where l.tipo = 'despesa' and l.status = 'atrasado'
       and l.data_vencimento = current_date - 1
     group by l.casal_id
    union all
    select l.casal_id, 'fatura-fechou', count(*),
           sum(coalesce(v.valor_caixa, 0)), min(c.nome)
      from lancamentos l
      join v_lancamentos v on v.id = l.id
      join carteiras c on c.id = l.cartao_id
     where v.fatura_aberta
       and c.dia_fechamento = extract(day from current_date)::int
     group by l.casal_id
  )
  select a.endpoint, a.p256dh, a.auth,
    case x.tag
      when 'vence-amanha'  then case when x.qtd = 1 then x.primeira || ' vence amanhã'
                                     else x.qtd || ' contas vencem amanhã' end
      when 'vence-hoje'    then case when x.qtd = 1 then x.primeira || ' vence hoje'
                                     else x.qtd || ' contas vencem hoje' end
      when 'atrasou'       then case when x.qtd = 1 then x.primeira || ' está atrasada'
                                     else x.qtd || ' contas ficaram atrasadas' end
      when 'fatura-fechou' then case when x.qtd = 1 then 'A fatura do ' || x.primeira || ' fechou'
                                     else x.qtd || ' faturas fecharam' end
    end,
    case x.tag
      when 'fatura-fechou' then 'Confirme o valor final para fechar o mês'
      else to_char(x.total, 'FM"R$" 999G999G990D00')
    end,
    x.tag, '/lancamentos'
  from avisos x
  join assinaturas_push a on a.casal_id = x.casal_id
 where x.qtd > 0 and a.falhas < 5
$$;
revoke all on function fn_avisos_para_push() from public, anon, authenticated;
grant execute on function fn_avisos_para_push() to service_role;

-- Erro passageiro nao apaga a assinatura: conta a falha. Depois de cinco, ela
-- para de ser tentada. Quem apaga de vez e a Edge Function, quando o servico do
-- fabricante responde 404 ou 410, que significa aparelho sem o app.
create or replace function fn_falha_no_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  update assinaturas_push set falhas = falhas + 1 where endpoint = p_endpoint
$$;
revoke all on function fn_falha_no_push(text) from public, anon, authenticated;
grant execute on function fn_falha_no_push(text) to service_role;

-- ============================================================
-- 4. O RELOGIO
-- ============================================================
create or replace function private.fn_disparar_push()
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_url text;
  v_token text;
begin
  select decrypted_secret into v_url   from vault.decrypted_secrets where name = 'url_push';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'token_cron_push';
  if v_url is null or v_token is null then
    raise warning 'push nao disparado: falta url_push ou token_cron_push no Vault';
    return null;
  end if;

  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  ) into v_id;

  return v_id;
end $$;

revoke all on function private.fn_disparar_push() from public, anon, authenticated;

-- 09:00 em Brasilia, que e 12:00 UTC. Uma vez por dia: os avisos ja vem
-- agrupados, e mais de uma vez so repetiria a mesma coisa.
select cron.schedule('estlim-push-do-dia', '0 12 * * *', $cron$ select private.fn_disparar_push(); $cron$);
