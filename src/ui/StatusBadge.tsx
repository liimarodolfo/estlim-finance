import type { StatusLanc } from '@/types/database'

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

/** Selo de status. O aporte concluído aparece como aplicado, em roxo. */
export function StatusBadge({ status }: { status: StatusExibido }) {
  return <span className={`tx-status ${CLASSE[status]}`}>{ROTULO[status]}</span>
}
