import { mascaraHora } from '@/lib/masks'

type Props = {
  id: string
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
}

/** Hora em 24h, HH:MM, com teclado numérico. Nunca type="time". */
export function InputHora({ id, valor, aoMudar, placeholder = 'HH:MM' }: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder}
      value={valor}
      onChange={(e) => aoMudar(mascaraHora(e.target.value))}
      autoComplete="off"
    />
  )
}
