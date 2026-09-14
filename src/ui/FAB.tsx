type Props = {
  aoClicar: () => void
  aberto?: boolean
  titulo?: string
}

export function FAB({ aoClicar, aberto = false, titulo = 'Novo lançamento' }: Props) {
  return (
    <button
      type="button"
      className={`fab${aberto ? ' open' : ''}`}
      onClick={aoClicar}
      title={titulo}
      aria-label={titulo}
    >
      <i className="fa-solid fa-plus" aria-hidden="true" />
    </button>
  )
}
