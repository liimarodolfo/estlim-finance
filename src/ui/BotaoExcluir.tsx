type Props = {
  aoClicar: () => void
  titulo?: string
}

/** Lixeira quadrada que fica ao lado de Salvar no rodapé dos sheets. */
export function BotaoExcluir({ aoClicar, titulo = 'Excluir' }: Props) {
  return (
    <button type="button" className="btn-del-ico" onClick={aoClicar} title={titulo} aria-label={titulo}>
      <i className="fa-solid fa-trash" aria-hidden="true" />
    </button>
  )
}
