import { mascaraData } from '@/lib/masks'

type Props = {
  id: string
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
}

/**
 * Data em DD/MM/AAAA com teclado numérico. Nunca type="date", que exibiria no
 * formato do sistema operacional e quebraria o padrão do projeto.
 */
export function InputData({ id, valor, aoMudar, placeholder = 'DD/MM/AAAA' }: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={10}
      placeholder={placeholder}
      value={valor}
      onChange={(e) => aoMudar(mascaraData(e.target.value))}
      autoComplete="off"
    />
  )
}
