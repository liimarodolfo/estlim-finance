import { fmtMoeda } from '@/lib/formatters'

export type FatiaDoDonut = {
  id: string
  nome: string
  cor: string
  icone: string
  valor: number
}

type Props = { fatias: FatiaDoDonut[] }

/**
 * Donut desenhado à mão, como no protótipo: cada fatia é um círculo com
 * stroke-dasharray que cresce de zero quando o card entra na tela.
 */
export function Donut({ fatias }: Props) {
  const total = fatias.reduce((s, f) => s + f.valor, 0)
  const totalSeguro = total || 1

  // Cada fatia comeca onde a anterior terminou. O deslocamento acumulado e
  // calculado antes do map, para nao haver reatribuicao durante o render.
  const percentuais = fatias.map((f) => (f.valor / totalSeguro) * 100)
  const deslocamentos = percentuais.reduce<number[]>(
    (acc, pct, i) => [...acc, (acc[i] ?? 25) - pct],
    [25],
  )

  const segmentos = fatias.map((f, i) => {
    const pct = percentuais[i]
    const traco = Math.max(pct - 1.2, 0.4)
    return (
      <circle
        key={f.id}
        className="donut-seg"
        cx="21"
        cy="21"
        r="15.9"
        fill="none"
        stroke={f.cor}
        strokeWidth="5.5"
        style={{ transitionDelay: `${i * 130}ms` }}
        strokeDasharray="0 100"
        data-dash={`${traco} ${100 - traco}`}
        strokeDashoffset={deslocamentos[i]}
        strokeLinecap="round"
      >
        <title>{`${f.nome}: ${fmtMoeda(f.valor)}`}</title>
      </circle>
    )
  })

  const totalCurto =
    total >= 1000
      ? `${(total / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`
      : fmtMoeda(total)

  return (
    <div className="chart-wrap">
      <svg width="132" height="132" viewBox="0 0 42 42" id="donut" role="img" aria-label="Gastos por categoria">
        {segmentos}
        <text x="21" y="20.4" textAnchor="middle" fontSize="2.3" fill="var(--muted)" style={{ letterSpacing: '.06em' }}>
          GASTOS
        </text>
        <text x="21" y="24.4" textAnchor="middle" fontSize="4.4" fontWeight="800" fill="var(--ink)" style={{ letterSpacing: '-.04em' }}>
          {total >= 1000 ? `R$ ${totalCurto}` : totalCurto}
        </text>
      </svg>
      <div className="donut-legend">
        {fatias.length === 0 ? (
          <div className="empty">Sem despesas no mês</div>
        ) : (
          fatias.map((f, i) => (
            <div className="legend-item" key={f.id} style={{ ['--i' as string]: i }}>
              <span className="lg-ico" style={{ background: `${f.cor}1e`, color: f.cor }}>
                <i className={`fa-solid ${f.icone}`} aria-hidden="true" />
              </span>
              <span className="lg-nome">
                {f.nome}
                <em>{Math.round((f.valor / totalSeguro) * 100)}%</em>
              </span>
              <b>{fmtMoeda(f.valor)}</b>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
