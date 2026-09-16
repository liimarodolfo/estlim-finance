-- ESTLIM · o push para de depender de uma configuracao do painel
--
-- A Edge Function tinha verify_jwt desligado, e a autenticacao dela era o token
-- do Vault no Authorization. Funcionava, mas verify_jwt e configuracao do
-- painel, e um deploy pelo MCP a devolve para o padrao ligado. Foi o que
-- aconteceu ao publicar os avisos entre o casal: o gateway passou a exigir JWT,
-- o token do Vault nao e JWT, e toda chamada virou
-- "UNAUTHORIZED_INVALID_JWT_FORMAT". Em silencio, porque ninguem olha o
-- net._http_response. Teria levado junto o aviso diario do cron.
--
-- A correcao tira o assunto do caminho. Vao dois headers:
--   Authorization: a anon key, que e publica e o bundle ja expoe, so para o
--                  gateway deixar passar.
--   x-token-push:  o segredo do Vault, que e a prova de verdade e continua
--                  sendo mais estrito do que aceitar qualquer JWT do projeto.
--
-- O valor real da anon key foi gravado uma vez pelo MCP e vive so no Vault:
--   vault.create_secret('<anon key>', 'anon_push', ...)

create or replace function private.fn_headers_push()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_anon  text;
  v_token text;
begin
  select decrypted_secret into v_anon  from vault.decrypted_secrets where name = 'anon_push';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'token_cron_push';
  if v_anon is null or v_token is null then return null; end if;

  return jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer ' || v_anon,
    'x-token-push',  v_token
  );
end $$;
revoke all on function private.fn_headers_push() from public, anon, authenticated;

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
  v_perfis  uuid[];
  v_headers jsonb;
  v_url     text;
begin
  select array_agg(distinct a.perfil_id) into v_perfis
    from assinaturas_push a
   where a.casal_id = p_casal
     and a.perfil_id is distinct from p_autor
     and a.falhas < 5;

  if v_perfis is null then return; end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'url_push';
  v_headers := private.fn_headers_push();
  if v_url is null or v_headers is null then
    raise warning 'aviso nao enviado: falta url_push, anon_push ou token_cron_push no Vault';
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := v_headers,
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

create or replace function private.fn_disparar_push()
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id      bigint;
  v_url     text;
  v_headers jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'url_push';
  v_headers := private.fn_headers_push();
  if v_url is null or v_headers is null then
    raise warning 'push nao disparado: falta url_push, anon_push ou token_cron_push no Vault';
    return null;
  end if;

  select net.http_post(
    url     := v_url,
    headers := v_headers,
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  ) into v_id;

  return v_id;
end $$;
revoke all on function private.fn_disparar_push() from public, anon, authenticated;
