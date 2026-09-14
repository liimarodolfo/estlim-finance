import { ICONES_CATEGORIA } from '@/lib/marcas'

type Props = {
  valor: string | null
  cor: string
  aoEscolher: (icone: string) => void
}

/** Biblioteca de 40 ícones. O escolhido cresce e recebe a cor da categoria. */
export function SeletorIcone({ valor, cor, aoEscolher }: Props) {
  return (
    <div className="icon-grid" role="radiogroup" aria-label="Ícone da categoria">
      {ICONES_CATEGORIA.map((icone) => {
        const escolhido = valor === `fa-${icone}`
        return (
          <button
            key={icone}
            type="button"
            role="radio"
            aria-checked={escolhido}
            aria-label={icone}
            title={icone}
            className={`icon-sw${escolhido ? ' sel' : ''}`}
            style={escolhido ? { background: cor } : undefined}
            onClick={() => aoEscolher(`fa-${icone}`)}
          >
            <i className={`fa-solid fa-${icone}`} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
