type Props = {
  epico: number
  o_que: string
}

/** Placeholder das telas ainda não construídas. Sai quando o épico correspondente entrar. */
export function EmConstrucao({ epico, o_que }: Props) {
  return (
    <div className="card">
      <div className="empty">
        <i className="fa-solid fa-helmet-safety" style={{ fontSize: 22, display: 'block', marginBottom: 10 }} aria-hidden="true" />
        {o_que}
        <br />
        <b style={{ color: 'var(--ink)' }}>Épico {epico}</b>
      </div>
    </div>
  )
}
