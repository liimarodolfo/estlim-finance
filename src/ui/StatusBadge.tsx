import type { LancTipo, StatusLanc } from '@/types/database'

export type StatusExibido = StatusLanc | 'aplicado' | 'recebido'

const ROTULO: Record<StatusExibido, string> = {
  pendente: 'pendente',
  pago: 'pago',
  atrasado: 'atrasado',
  aplicado: 'aplicado',
  recebido: 'recebido',
}

const CLASSE: Record<StatusExibido, string> = {
  pendente: 'st-pendente',
  pago: 'st-pago',
  atrasado: 'st-atrasado',
  aplicado: 'st-aplicado',
  recebido: 'st-pago',
}

/**
 * Concluído não se chama "pago" em todo lançamento: receita é recebida e
 * aporte é aplicado. Pendente e atrasado valem para os três.
 */
function concluido(tipo: LancTipo | null | undefined): StatusExibido {
  if (tipo === 'receita') return 'recebido'
  if (tipo === 'investimento') return 'aplicado'
  return 'pago'
}

type Props = {
  status: StatusExibido
  /** Com o tipo, o selo de concluído troca de palavra sozinho. */
  tipo?: LancTipo | null
}

/** Selo de status. O aporte concluído aparece como aplicado, em roxo. */
export function StatusBadge({ status, tipo }: Props) {
  const exibido = status === 'pago' ? concluido(tipo) : status
  // O protótipo usa <i> aqui, e o reset dele já neutraliza o itálico.
  return <i className={`tx-status ${CLASSE[exibido]}`}>{ROTULO[exibido]}</i>
}
