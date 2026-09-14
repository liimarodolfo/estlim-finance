import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  aoClicar?: () => void
  icone?: string
  tipo?: 'button' | 'submit'
  variante?: 'primario' | 'verde' | 'aprovar' | 'fantasma'
  ocupado?: boolean
  desabilitado?: boolean
}

const CLASSE: Record<NonNullable<Props['variante']>, string> = {
  primario: 'btn-primary',
  verde: 'btn-primary green',
  aprovar: 'btn-sm approve',
  fantasma: 'btn-sm ghost',
}

export function BotaoPill({
  children,
  aoClicar,
  icone,
  tipo = 'button',
  variante = 'primario',
  ocupado,
  desabilitado,
}: Props) {
  return (
    <button
      type={tipo}
      className={CLASSE[variante]}
      onClick={aoClicar}
      disabled={desabilitado || ocupado}
    >
      {icone || ocupado ? (
        <i
          className={`fa-solid ${ocupado ? 'fa-spinner fa-spin' : icone}`}
          style={{ marginRight: 8 }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  )
}
