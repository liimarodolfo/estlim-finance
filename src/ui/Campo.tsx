import type { ReactNode } from 'react'

type Props = {
  id?: string
  rotulo: string
  icone: string
  children: ReactNode
  /** Vira "Motivo (obrigatório)" nos campos que o sistema exige. */
  obrigatorio?: boolean
}

/** Bloco de campo do protótipo: rótulo com ícone em cima, controle embaixo. */
export function Campo({ id, rotulo, icone, children, obrigatorio }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
        {obrigatorio ? `${rotulo} (obrigatório)` : rotulo}
      </label>
      {children}
    </div>
  )
}
