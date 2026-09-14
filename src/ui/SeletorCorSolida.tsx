import { CORES_CATEGORIA } from '@/lib/marcas'

type Props = {
  valor: string | null
  aoEscolher: (cor: string) => void
}

/** As doze cores sólidas das categorias. Escolher é obrigatório no CRUD. */
export function SeletorCorSolida({ valor, aoEscolher }: Props) {
  return (
    <div className="cor-row" role="radiogroup" aria-label="Cor da categoria">
      {CORES_CATEGORIA.map((cor) => (
        <button
          key={cor}
          type="button"
          role="radio"
          aria-checked={valor === cor}
          aria-label={cor}
          title={cor}
          className={`cor-sw cor-solida${valor === cor ? ' sel' : ''}`}
          style={{ background: cor }}
          onClick={() => aoEscolher(cor)}
        />
      ))}
    </div>
  )
}
