import { fmtMoeda } from '@/lib/formatters'
import type { MesDoHistorico } from '@/hooks/useDashboard'

type Props = { meses: MesDoHistorico[] }

/** Barras de receitas contra despesas, seis meses, com a grade em escala redonda. */
export function Barras({ meses }: Props) {
  const maior = Math.max(1, ...meses.flatMap((m) => [m.receitas, m.despesas]))
  const passo = maior > 5000 ? 5000 : maior > 1000 ? 1000 : 100
  const topo = Math.ceil(maior / passo) * passo

  return (
    <>
      <div className="bars">
        <div className="bar-grid">
          {[1, 0.75, 0.5, 0.25, 0].map((p) => (
            <div className="grid-line" key={p}>
              <span>{p ? `${Math.round((topo * p) / 1000)}k` : '0'}</span>
            </div>
          ))}
        </div>
        {meses.map((m, i) => (
          <div className="bar-col" key={`${m.rotulo}-${i}`} style={{ ['--i' as string]: i }}>
            <div className="bar-pair">
              <div className="bar in" data-h={`${(m.receitas / topo) * 100}%`} data-v={fmtMoeda(m.receitas)} />
              <div className="bar out" data-h={`${(m.despesas / topo) * 100}%`} data-v={fmtMoeda(m.despesas)} />
            </div>
            <span className="bar-label">{m.rotulo}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend-row">
        <span>
          <i style={{ background: 'var(--income)' }} />
          Receitas
        </span>
        <span>
          <i style={{ background: 'var(--expense)' }} />
          Despesas
        </span>
      </div>
    </>
  )
}
