import type { ReactNode } from 'react'

type Props = {
  ativo?: boolean
  icone?: string
  aoClicar: () => void
  children: ReactNode
}

/** Pill de filtro. Ativo fica em tinta no light e em branco no dark. */
export function Chip({ ativo, icone, aoClicar, children }: Props) {
  return (
    <button
      type="button"
      className={`chip${ativo ? ' active' : ''}`}
      onClick={aoClicar}
      aria-pressed={ativo}
    >
      {icone ? <i className={`fa-solid ${icone}`} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
