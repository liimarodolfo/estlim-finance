import { useEffect, useRef } from 'react'
import type { Notificacao } from '@/hooks/useNotificacoes'

type Props = {
  aberto: boolean
  aoFechar: () => void
  notificacoes: Notificacao[]
  aoTocar: (n: Notificacao) => void
  /** Referência do sino, para o clique nele não contar como clique fora. */
  sino: React.RefObject<HTMLButtonElement | null>
}

export function PainelNotificacoes({ aberto, aoFechar, notificacoes, aoTocar, sino }: Props) {
  const painel = useRef<HTMLDivElement>(null)

  // Fecha ao tocar fora e ao apertar Esc, como no protótipo.
  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (painel.current?.contains(alvo) || sino.current?.contains(alvo)) return
      aoFechar()
    }
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('click', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('click', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto, aoFechar, sino])

  return (
    <div className={`notif-panel${aberto ? ' open' : ''}`} ref={painel} role="dialog" aria-label="Notificações">
      {notificacoes.length === 0 ? (
        <div className="empty">Sem notificações</div>
      ) : (
        notificacoes.map((n) => {
          const clicavel = Boolean(n.lancamento)
          return (
            <div
              className="notif-item"
              key={n.id}
              style={clicavel ? { cursor: 'pointer' } : undefined}
              role={clicavel ? 'button' : undefined}
              tabIndex={clicavel ? 0 : undefined}
              onClick={clicavel ? () => aoTocar(n) : undefined}
              onKeyDown={
                clicavel
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') aoTocar(n)
                    }
                  : undefined
              }
            >
              <div className="n-ico" style={{ background: n.fundo, color: n.cor }}>
                <i className={`fa-solid ${n.icone}`} aria-hidden="true" />
              </div>
              <div>
                <b>{n.titulo}</b>
                <span>{n.apoio}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
