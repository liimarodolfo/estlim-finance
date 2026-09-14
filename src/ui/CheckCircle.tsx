type Props = {
  concluido: boolean
  aoClicar: (evento: React.MouseEvent<HTMLButtonElement>) => void
  /** Muda só o texto de acessibilidade: pago para despesa, recebido para receita. */
  rotulo?: string
  desabilitado?: boolean
}

/** Check circular de baixa. O pulo do concluído vem do keyframe checkPop do protótipo. */
export function CheckCircle({ concluido, aoClicar, rotulo = 'pago', desabilitado }: Props) {
  return (
    <button
      type="button"
      className={`check-circle${concluido ? ' done' : ''}`}
      onClick={aoClicar}
      disabled={desabilitado}
      aria-pressed={concluido}
      title={concluido ? `Desfazer ${rotulo}` : `Marcar como ${rotulo}`}
      aria-label={concluido ? `Desfazer ${rotulo}` : `Marcar como ${rotulo}`}
    >
      <i className="fa-solid fa-check" aria-hidden="true" />
    </button>
  )
}
