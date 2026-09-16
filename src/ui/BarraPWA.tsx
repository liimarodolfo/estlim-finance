import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from '@/store/useToasts'
import { comoInstalar } from '@/lib/instalacao'

// Dispensar o convite é preferência de aparelho, não dado de negócio: por isso
// mora no localStorage e não viaja com a conta.
const CHAVE_DISPENSA = 'estlim.instalar.dispensado'

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Duas coisas do PWA que precisam de tela: o convite para instalar e o aviso de
 * versão nova. Ficam como pílulas flutuantes acima da navegação, na mesma
 * linguagem dos toasts, e somem sozinhas quando não têm o que dizer.
 */
export function BarraPWA() {
  const [convite, setConvite] = useState<EventoDeInstalacao | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [dispensado, setDispensado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_DISPENSA) === '1'
    } catch {
      return false
    }
  })
  const [passoAPasso, setPassoAPasso] = useState(false)

  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (erro) => console.error('[pwa] falhou ao registrar', erro),
  })

  useEffect(() => {
    const aoPoderInstalar = (e: Event) => {
      e.preventDefault()
      setConvite(e as EventoDeInstalacao)
    }
    const aoInstalar = () => {
      setConvite(null)
      toast('ESTLIM instalado neste aparelho', 'fa-mobile-screen')
    }
    const aoFicarOnline = () => setOnline(true)
    const aoFicarOffline = () => setOnline(false)

    // O service worker avisa quando o usuário toca numa notificação, para a
    // janela que já está aberta ir até a tela do aviso em vez de ficar parada.
    const aoReceberDoSW = (e: MessageEvent) => {
      if (e.data?.type === 'IR_PARA' && typeof e.data.caminho === 'string') {
        window.history.pushState({}, '', e.data.caminho)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }

    navigator.serviceWorker?.addEventListener('message', aoReceberDoSW)
    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)
    window.addEventListener('online', aoFicarOnline)
    window.addEventListener('offline', aoFicarOffline)
    return () => {
      navigator.serviceWorker?.removeEventListener('message', aoReceberDoSW)
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
      window.removeEventListener('online', aoFicarOnline)
      window.removeEventListener('offline', aoFicarOffline)
    }
  }, [])

  const instalar = async () => {
    if (!convite) return
    await convite.prompt()
    const { outcome } = await convite.userChoice
    if (outcome === 'dismissed') toast('Você pode instalar depois pelo menu do navegador', 'fa-circle-info')
    setConvite(null)
  }

  const dispensar = () => {
    setDispensado(true)
    setPassoAPasso(false)
    setConvite(null)
    try {
      localStorage.setItem(CHAVE_DISPENSA, '1')
    } catch {
      // Navegação privada recusa o storage. O convite volta na próxima visita.
    }
  }

  const caminho = comoInstalar(convite !== null)
  // No Safari o beforeinstallprompt nunca dispara, então o convite automático
  // não existe. Em vez de ficar mudo, o app ensina o caminho de lá.
  const manual = !dispensado && online && (caminho === 'ios' || caminho === 'safari-mac')

  if (!convite && !manual && !precisaAtualizar && online) return null

  return (
    <div className="pwa-barra">
      {!online ? (
        <div className="pwa-pill pwa-offline">
          <i className="fa-solid fa-cloud-arrow-down" aria-hidden="true" />
          Sem conexão. Mostrando os dados guardados no aparelho.
        </div>
      ) : null}

      {precisaAtualizar ? (
        <div className="pwa-pill">
          <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
          Versão nova disponível
          <button type="button" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
          <button type="button" className="pwa-depois" onClick={() => setPrecisaAtualizar(false)}>
            Depois
          </button>
        </div>
      ) : null}

      {convite && online && !dispensado ? (
        <div className="pwa-pill">
          <i className="fa-solid fa-circle-down" aria-hidden="true" />
          Instalar o ESTLIM no aparelho
          <button type="button" onClick={instalar}>
            Instalar
          </button>
          <button type="button" className="pwa-depois" onClick={dispensar}>
            Agora não
          </button>
        </div>
      ) : null}

      {manual && !passoAPasso ? (
        <div className="pwa-pill">
          <i className="fa-solid fa-circle-down" aria-hidden="true" />
          Instalar o ESTLIM no aparelho
          <button type="button" onClick={() => setPassoAPasso(true)}>
            Como fazer
          </button>
          <button type="button" className="pwa-depois" onClick={dispensar}>
            Agora não
          </button>
        </div>
      ) : null}

      {manual && passoAPasso ? (
        <div className="pwa-pill pwa-passos">
          <div className="pwa-passos-texto">
            <b>
              <i className="fa-solid fa-circle-down" aria-hidden="true" />
              Instalar o ESTLIM
            </b>
            {caminho === 'ios' ? (
              <span>
                O Safari não tem botão de instalar. Toque em{' '}
                <i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" /> Compartilhar,
                na barra de baixo, e escolha <b>Adicionar à Tela de Início</b>.
              </span>
            ) : (
              <span>
                No Safari do Mac, abra o menu <b>Arquivo</b> e escolha{' '}
                <b>Adicionar ao Dock</b>.
              </span>
            )}
          </div>
          <button type="button" className="pwa-depois" onClick={dispensar}>
            Entendi
          </button>
        </div>
      ) : null}
    </div>
  )
}
