import type { ReactNode } from 'react'

type Props = {
  icone: string
  children: ReactNode
  acessorio?: ReactNode
  style?: React.CSSProperties
}

export function TituloSecao({ icone, children, acessorio, style }: Props) {
  return (
    <div className="section-title" style={style}>
      <span className="st-l">
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
        {children}
      </span>
      {acessorio ? <small>{acessorio}</small> : null}
    </div>
  )
}
