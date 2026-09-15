import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from '@/store/useToasts'

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

    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)
    window.addEventListener('online', aoFicarOnline)
    window.addEventListener('offline', aoFicarOffline)
    return () => {
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

  if (!convite && !precisaAtualizar && online) return null

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

      {convite && online ? (
        <div className="pwa-pill">
          <i className="fa-solid fa-circle-down" aria-hidden="true" />
          Instalar o ESTLIM no aparelho
          <button type="button" onClick={instalar}>
            Instalar
          </button>
          <button type="button" className="pwa-depois" onClick={() => setConvite(null)}>
            Agora não
          </button>
        </div>
      ) : null}
    </div>
  )
}
