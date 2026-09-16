// ESTLIM · envia as notificacoes para os aparelhos assinados.
//
// Ela atende tres chamadas. Sem corpo, monta os avisos do dia, e quem chama e o
// pg_cron uma vez por dia. Com para_perfis, entrega uma mensagem pronta que um
// gatilho do banco escreveu, e e assim que um do casal fica sabendo do que o
// outro acabou de lancar. Com teste_para, manda um aviso avulso, para conferir
// o caminho ponta a ponta sem esperar o relogio.
//
// SOBRE A AUTENTICACAO
// Quem chama manda duas coisas. No Authorization vai a anon key, que e publica
// e existe so para o gateway do Supabase deixar a chamada passar. A prova de
// verdade vai no x-token-push, conferida aqui contra um segredo do Vault: um
// JWT valido do projeto nao basta, porque qualquer um le a anon key no bundle.
//
// O header proprio tambem tira a funcao da dependencia do verify_jwt, que e uma
// configuracao do painel e volta ao padrao a cada deploy. Ja derrubou o push uma
// vez, em silencio.
//
// A chave privada VAPID tambem vem do Vault, nunca do codigo.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'

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
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })

// O payload criptografado chegava no iPhone com os acentos virando o losango de
// substituicao: "Serao" saia "Ser?o". Em vez de depender de como cada camada
// trata byte multibyte, o JSON sai em ASCII puro, com os acentos escapados em
// \uXXXX. O JSON.parse do service worker devolve o caractere certo do outro
// lado, e nao sobra ambiguidade no meio do caminho.
const emAscii = (texto: string) =>
  texto.replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))

Deno.serve(async (req: Request) => {
  const banco = createClient(URL_SUPABASE, CHAVE_SERVICO)

  const { data: token } = await banco.rpc('fn_token_cron_push')
  const provou =
    req.headers.get('x-token-push') ??
    req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token || provou !== token) {
    return json({ erro: 'Não autorizado.' }, 401)
  }

  const { data: chave, error: erroChave } = await banco.rpc('fn_chave_push')
  if (erroChave || !chave) {
    return json({ erro: 'Chave do push indisponível.', detalhe: erroChave }, 500)
  }

  webpush.setVapidDetails('mailto:rodolfo@rliima.com', VAPID_PUBLICA, chave as string)

  // Com perfis no corpo, a mensagem ja vem escrita e so precisa ser entregue.
  // Sem corpo, valem os avisos do dia que o banco monta.
  let avisos: Aviso[] = []
  const texto = await req.text()
  const pedido = texto ? JSON.parse(texto) : {}

  const perfis: string[] = pedido?.para_perfis ?? (pedido?.teste_para ? [pedido.teste_para] : [])

  if (perfis.length) {
    const { data } = await banco
      .from('assinaturas_push')
      .select('endpoint, p256dh, auth')
      .in('perfil_id', perfis)
    avisos = (data ?? []).map((a: { endpoint: string; p256dh: string; auth: string }) => ({
      ...a,
      titulo: pedido.titulo ?? 'Notificação de teste',
      corpo: pedido.corpo ?? 'Se você está lendo isto, o push está funcionando.',
      tag: pedido.tag ?? 'teste',
      caminho: pedido.caminho ?? '/',
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
    const carga = emAscii(
      JSON.stringify({
        titulo: aviso.titulo,
        corpo: aviso.corpo,
        tag: aviso.tag,
        caminho: aviso.caminho,
      }),
    )

    try {
      await webpush.sendNotification(assinatura, Buffer.from(carga, 'ascii'), {
        TTL: 60 * 60 * 12,
      })
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
