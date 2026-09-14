type Props = { bandeira?: string | null }

/** Mastercard, Visa e Elo desenhados em CSS, iguais aos do protótipo. */
export function Bandeira({ bandeira }: Props) {
  if (bandeira === 'mastercard') {
    return (
      <span className="flag" aria-label="Mastercard">
        <span className="mc">
          <i />
          <i />
        </span>
      </span>
    )
  }
  if (bandeira === 'visa') {
    return (
      <span className="flag" aria-label="Visa">
        <span className="visa">VISA</span>
      </span>
    )
  }
  if (bandeira === 'elo') {
    return (
      <span className="flag" aria-label="Elo">
        <span className="elo">elo</span>
      </span>
    )
  }
  return null
}
