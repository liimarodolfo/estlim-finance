import { useEffect, useRef } from 'react'
import { MESES } from '@/lib/formatters'
import { useFiltros } from '@/store/useFiltros'

export function MesPills() {
  const mes = useFiltros((e) => e.mes)
  const setMes = useFiltros((e) => e.setMes)
  const trilho = useRef<HTMLDivElement>(null)

  // Mantem o mes ativo visivel ao trocar de mes pelo teclado ou por outra tela.
  useEffect(() => {
    trilho.current
      ?.querySelector<HTMLButtonElement>('.month-pill.active')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [mes])

  return (
    <div className="months" ref={trilho} role="tablist" aria-label="Meses do ano">
      {MESES.map((nome, i) => (
        <button
          key={nome}
          type="button"
          role="tab"
          aria-selected={i === mes}
          className={`month-pill${i === mes ? ' active' : ''}`}
          style={{ ['--i' as string]: i }}
          onClick={() => setMes(i)}
        >
          {nome}
        </button>
      ))}
    </div>
  )
}
