import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { usePerfil } from '@/hooks/usePerfil'
import { ehIOS, jaInstalado } from '@/lib/instalacao'

// Chave publica do par VAPID. Publica mesmo: ela viaja para o navegador e o
// servico de push do fabricante a usa para conferir a assinatura do servidor.
// A privada fica no Vault do Supabase e so a Edge Function a le.
const VAPID_PUBLICA =
  'BHpVt_wmsCLNBo3dshr5dagzbYAcXAfSl_n0mxa4zyNcfILYfoiCPstX5kHVFDB2sSCUdCqvAoHjWX5-zY_ib14'

/** O navegador quer a chave em bytes, não no texto base64url que guardamos. */
function paraBytes(base64url: string): Uint8Array {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const bruto = atob(base64)
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

function paraTexto(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export type SituacaoPush =
  | 'pronto'         // assinado neste aparelho
  | 'pode-ativar'    // dá para pedir a permissão
  | 'negado'         // o usuário recusou; só nos ajustes do aparelho
  | 'precisa-instalar' // iOS sem o app na tela de início
  | 'sem-suporte'

/** Um nome curto para o usuário reconhecer o aparelho na lista. */
function nomeDoAparelho(): string {
  const ua = navigator.userAgent
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/macintosh/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows'
  return 'Este aparelho'
}

export function useSituacaoPush() {
  return useQuery({
    queryKey: ['push', 'situacao'],
    queryFn: async (): Promise<SituacaoPush> => {
      const temSuporte = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      // No iPhone o push só existe com o app na tela de início. No Safari em
      // aba a API nem aparece, e insistir só gera erro sem explicação.
      if (!temSuporte) return ehIOS() && !jaInstalado() ? 'precisa-instalar' : 'sem-suporte'
      if (ehIOS() && !jaInstalado()) return 'precisa-instalar'
      if (Notification.permission === 'denied') return 'negado'

      const registro = await navigator.serviceWorker.getRegistration()
      const assinatura = await registro?.pushManager.getSubscription()
      return assinatura ? 'pronto' : 'pode-ativar'
    },
    staleTime: 30_000,
  })
}

export function useAtivarPush() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')

      // A permissão precisa sair de um toque do usuário. Chamada fora de um
      // gesto, o iOS recusa em silêncio.
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        throw new Error('Permissão negada. Você pode liberar nos ajustes do aparelho.')
      }

      const registro = await navigator.serviceWorker.ready
      const assinatura =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: paraBytes(VAPID_PUBLICA) as BufferSource,
        }))

      const { error } = await supabase.from('assinaturas_push').upsert(
        {
          casal_id: perfil.casal_id,
          perfil_id: perfil.id,
          endpoint: assinatura.endpoint,
          p256dh: paraTexto(assinatura.getKey('p256dh')),
          auth: paraTexto(assinatura.getKey('auth')),
          aparelho: nomeDoAparelho(),
          falhas: 0,
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push'] }),
  })
}

export function useDesativarPush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const registro = await navigator.serviceWorker.getRegistration()
      const assinatura = await registro?.pushManager.getSubscription()
      if (!assinatura) return

      const endpoint = assinatura.endpoint
      await assinatura.unsubscribe()
      const { error } = await supabase.from('assinaturas_push').delete().eq('endpoint', endpoint)
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push'] }),
  })
}
