import { useToasts } from '@/store/useToasts'

/** Fila de toasts. A entrada, a barra de progresso e a saída vêm do CSS do protótipo. */
export function ToastZone() {
  const toasts = useToasts((e) => e.toasts)

  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.saindo ? ' out' : ''}`}>
          <i className={`fa-solid ${t.icone}`} aria-hidden="true" />
          {t.texto}
        </div>
      ))}
    </div>
  )
}
