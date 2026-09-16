/// <reference lib="webworker" />

/**
 * Service worker do ESTLIM.
 *
 * Ele era gerado automaticamente pelo plugin, o que dava o cache offline mas
 * nao deixava espaco para nada mais. Push exige um handler proprio, entao o
 * arquivo passou a ser escrito a mao: o precache continua igual, e no fim vem
 * o que o gerado nao conseguia ter.
 */
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// O Supabase nunca entra no cache: quem guarda os dados offline e o React Query
// no IndexedDB, que sabe a idade deles.
registerRoute(({ url }) => url.hostname.endsWith('.supabase.co'), new NetworkOnly())

// Navegacao cai no index, menos o que for API.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/],
  }),
)

// A atualizacao so acontece quando o usuario toca em Atualizar na pilula.
self.addEventListener('message', (evento) => {
  if (evento.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
clientsClaim()

// ============ PUSH ============

type Carga = { titulo?: string; corpo?: string; tag?: string; caminho?: string }

self.addEventListener('push', (evento) => {
  let carga: Carga = {}
  try {
    carga = evento.data ? (evento.data.json() as Carga) : {}
  } catch {
    carga = { corpo: evento.data?.text() }
  }

  const titulo = carga.titulo ?? 'ESTLIM'
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: carga.corpo ?? '',
      // O iOS usa o icone do app, mas Android e desktop respeitam estes.
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      // A tag faz um aviso novo substituir o anterior do mesmo tipo, em vez de
      // empilhar tres avisos de "vence amanha" na tela de bloqueio.
      tag: carga.tag ?? 'estlim',
      data: { caminho: carga.caminho ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const caminho = (evento.notification.data?.caminho as string) ?? '/'

  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Se o app ja esta aberto, leva a janela existente para a tela do aviso em
      // vez de abrir outra.
      for (const janela of janelas) {
        if ('focus' in janela) {
          await janela.focus()
          janela.postMessage({ type: 'IR_PARA', caminho })
          return
        }
      }
      await self.clients.openWindow(caminho)
    })(),
  )
})
