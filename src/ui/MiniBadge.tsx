import type { ReactNode } from 'react'

export type TomBadge = 'neutro' | 'fixa' | 'parc' | 'var' | 'fat' | 'inv' | 'metodo'

type Props = {
  tom?: TomBadge
  icone?: string
  children: ReactNode
  titulo?: string
}

/** Selo pequeno das linhas de lançamento. Uma linha só, com reticências. */
export function MiniBadge({ tom = 'neutro', icone, children, titulo }: Props) {
  const classe = tom === 'neutro' ? 'mini-badge' : `mini-badge ${tom}`
  return (
    <i className={classe} title={titulo ?? (typeof children === 'string' ? children : undefined)}>
      {icone ? <i className={`fa-solid ${icone}`} aria-hidden="true" /> : null}
      {children}
    </i>
  )
}
