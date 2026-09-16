// ESTLIM · envia as notificacoes do dia para os aparelhos assinados.
//
// Quem chama e o pg_cron, uma vez por dia. A verificacao de JWT do painel fica
// desligada de proposito: a funcao faz a propria conferencia contra um token
// que vive no Vault, o que e mais estrito do que aceitar qualquer JWT do
// projeto, inclusive a anon key que qualquer um le no bundle.
//
// A chave privada VAPID tambem vem do Vault, nunca do codigo.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLICA =
  'BHpVt_wmsCLNBo3dshr5dagzbYAcXAfSl_n0mxa4zyNcfILYfoiCPstX5kHVFDB2sSCUdCqvAoHjWX5-zY_ib14'

type Aviso = {
  endpoint: string
  p256dh: string
  auth: string
  titulo: string
  corpo: string
  tag: string
  caminho: string
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  const banco = createClient(URL_SUPABASE, CHAVE_SERVICO)

  const { data: token } = await banco.rpc('fn_token_cron_push')
  if (!token || req.headers.get('Authorization') !== `Bearer ${token}`) {
    return json({ erro: 'Não autorizado.' }, 401)
  }

  const { data: chave, error: erroChave } = await banco.rpc('fn_chave_push')
  if (erroChave || !chave) {
    return json({ erro: 'Chave do push indisponível.', detalhe: erroChave }, 500)
  }

  webpush.setVapidDetails('mailto:rodolfo@rliima.com', VAPID_PUBLICA, chave as string)

  // Com teste_para no corpo, manda um aviso unico para os aparelhos daquele
  // perfil. Sem corpo, valem os avisos do dia que o banco monta.
  let avisos: Aviso[] = []
  const texto = await req.text()
  const pedido = texto ? JSON.parse(texto) : {}

  if (pedido?.teste_para) {
    const { data } = await banco
      .from('assinaturas_push')
      .select('endpoint, p256dh, auth')
      .eq('perfil_id', pedido.teste_para)
    avisos = (data ?? []).map((a: { endpoint: string; p256dh: string; auth: string }) => ({
      ...a,
      titulo: pedido.titulo ?? 'Notificação de teste',
      corpo: pedido.corpo ?? 'Se você está lendo isto, o push está funcionando.',
      tag: 'teste',
      caminho: '/',
    }))
  } else {
    const { data, error } = await banco.rpc('fn_avisos_para_push')
    if (error) return json({ erro: 'Falha ao montar os avisos.', detalhe: error }, 500)
    avisos = (data ?? []) as Aviso[]
  }

  let enviados = 0
  const mortas: string[] = []
  const erros: string[] = []

  for (const aviso of avisos) {
    const assinatura = { endpoint: aviso.endpoint, keys: { p256dh: aviso.p256dh, auth: aviso.auth } }
    const carga = JSON.stringify({
      titulo: aviso.titulo,
      corpo: aviso.corpo,
      tag: aviso.tag,
      caminho: aviso.caminho,
    })

    try {
      await webpush.sendNotification(assinatura, carga, { TTL: 60 * 60 * 12 })
      enviados++
    } catch (erro) {
      const status = (erro as { statusCode?: number }).statusCode
      // 404 e 410 dizem que o aparelho desinstalou o app ou revogou a permissao:
      // a assinatura morreu e nao adianta insistir.
      if (status === 404 || status === 410) mortas.push(aviso.endpoint)
      else {
        erros.push(`${status ?? 'erro'}: ${(erro as Error).message}`)
        await banco.rpc('fn_falha_no_push', { p_endpoint: aviso.endpoint })
      }
    }
  }

  if (mortas.length) await banco.from('assinaturas_push').delete().in('endpoint', mortas)

  return json({ avisos: avisos.length, enviados, removidas: mortas.length, erros })
})
