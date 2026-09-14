import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useSheets } from '@/store/useSheets'

type Props = {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  icone?: string
  corIcone?: string
  children: ReactNode
  /** Vai para o rodapé fixo, fora da área de rolagem. */
  acoes?: ReactNode
}

/**
 * Bottom sheet no mobile, modal centralizado no desktop. Cabeçalho fixo com
 * título e X, corpo com rolagem própria, rodapé fixo com as ações. Fecha pelo X,
 * por toque no fundo e pela tecla Esc.
 *
 * O painel fica sempre no DOM e só troca de classe, como no protótipo. Assim a
 * transição de entrada tem de onde partir e não existe corrida entre montar o
 * elemento e aplicar a classe. Fechado, ele recebe inert, então nem o leitor de
 * tela nem o Tab alcançam o conteúdo escondido.
 */
export function Sheet({ aberto, aoFechar, titulo, icone, corIcone, children, acoes }: Props) {
  const [rolado, setRolado] = useState(false)
  const corpo = useRef<HTMLDivElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const tituloId = useId()

  const abrirContador = useSheets((e) => e.abrir)
  const fecharContador = useSheets((e) => e.fechar)

  // Esconde do teclado e do leitor de tela enquanto está fechado.
  useEffect(() => {
    const el = painel.current
    if (!el) return
    if (aberto) {
      el.removeAttribute('inert')
      el.removeAttribute('aria-hidden')
    } else {
      el.setAttribute('inert', '')
      el.setAttribute('aria-hidden', 'true')
    }
  }, [aberto])

  // Trava a rolagem do fundo, guarda o foco e escuta o Esc enquanto está aberto.
  useEffect(() => {
    if (!aberto) return

    abrirContador()
    focoAnterior.current = document.activeElement as HTMLElement | null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)

    // O corpo sempre abre no topo, e a sombra do cabeçalho começa apagada.
    if (corpo.current) corpo.current.scrollTop = 0
    const foco = window.setTimeout(() => painel.current?.focus(), 60)

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      window.clearTimeout(foco)
      fecharContador()
      focoAnterior.current?.focus?.()
    }
  }, [aberto, aoFechar, abrirContador, fecharContador])

  // A sombra do cabeçalho reaparece do zero a cada abertura.
  useEffect(() => {
    if (aberto) return
    const t = window.setTimeout(() => setRolado(false), 380)
    return () => window.clearTimeout(t)
  }, [aberto])

  return createPortal(
    <>
      <div className={`scrim${aberto ? ' open' : ''}`} onClick={aoFechar} aria-hidden="true" />
      <div
        className={`sheet${aberto ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={painel}
        tabIndex={-1}
      >
        <div className={`sheet-head${rolado ? ' scrolled' : ''}`}>
          <div className="sheet-handle" />
          <h2 id={tituloId}>
            {icone ? (
              <i
                className={`fa-solid ${icone}`}
                style={{ marginRight: 8, ...(corIcone ? { color: corIcone } : {}) }}
                aria-hidden="true"
              />
            ) : null}
            {titulo}
          </h2>
          <button type="button" className="sheet-close" onClick={aoFechar} title="Fechar" aria-label="Fechar">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div
          className="sheet-body"
          ref={corpo}
          onScroll={(e) => setRolado(e.currentTarget.scrollTop > 4)}
        >
          {children}
        </div>

        {acoes ? <div className="sheet-foot">{acoes}</div> : null}
      </div>
    </>,
    document.body,
  )
}
