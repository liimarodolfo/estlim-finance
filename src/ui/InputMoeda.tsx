import { mascaraMoeda } from '@/lib/masks'

type Props = {
  id: string
  /** Valor em reais. null é o lançamento de valor variável ainda sem valor. */
  valor: number | null
  aoMudar: (valor: number | null) => void
  placeholder?: string
}

const paraTexto = (valor: number | null) =>
  valor == null ? '' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Digitação em centavos: 1234 vira 12,34. Campo vazio devolve null. */
export function InputMoeda({ id, valor, aoMudar, placeholder = '0,00' }: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={paraTexto(valor)}
      onChange={(e) => {
        const { texto, numero } = mascaraMoeda(e.target.value)
        aoMudar(texto ? numero : null)
      }}
      autoComplete="off"
    />
  )
}
