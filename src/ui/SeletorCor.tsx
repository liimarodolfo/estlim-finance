import { GRADIENTES } from '@/lib/marcas'

type Props = {
  valor: string | null
  aoEscolher: (gradiente: string) => void
}

/** Os dez gradientes do protótipo. O escolhido ganha anel e o check branco. */
export function SeletorCor({ valor, aoEscolher }: Props) {
  return (
    <div className="cor-row" role="radiogroup" aria-label="Cor do card">
      {GRADIENTES.map(([nome, gradiente]) => (
        <button
          key={nome}
          type="button"
          role="radio"
          aria-checked={valor === gradiente}
          aria-label={nome}
          title={nome}
          className={`cor-sw${valor === gradiente ? ' sel' : ''}`}
          style={{ background: gradiente }}
          onClick={() => aoEscolher(gradiente)}
        />
      ))}
    </div>
  )
}
