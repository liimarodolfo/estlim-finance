import { mascaraTelefone } from '@/lib/masks'

type Props = {
  id: string
  valor: string
  aoMudar: (valor: string) => void
}

export function InputTelefone({ id, valor, aoMudar }: Props) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      maxLength={15}
      placeholder="(16) 99999-0000"
      value={valor}
      onChange={(e) => aoMudar(mascaraTelefone(e.target.value))}
      autoComplete="tel"
    />
  )
}
