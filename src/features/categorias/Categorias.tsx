import { useState } from 'react'
import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { BotaoPill } from '@/ui/BotaoPill'
import { useReveal } from '@/ui/useReveal'
import { fmtMoeda, MESES_LONGOS } from '@/lib/formatters'
import { useFiltros } from '@/store/useFiltros'
import { useCategorias, useGastosPorCategoria } from '@/hooks/useCategorias'
import { SheetCategoria } from '@/features/categorias/SheetCategoria'
import type { Categoria } from '@/types/database'

// Salário e Investimentos não entram na lista de orçamento: uma é receita,
// a outra é transferência de patrimônio, e nenhuma das duas é consumo do mês.
const FORA_DO_ORCAMENTO = ['Salário', 'Investimentos']

export default function Categorias() {
  const mes = useFiltros((e) => e.mes)
  const ano = useFiltros((e) => e.ano)
  const { data: categorias = [], isLoading } = useCategorias()
  const { data: gastos = {} } = useGastosPorCategoria(mes, ano)
  const [sheetAberto, setSheetAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Categoria | null>(null)

  const doOrcamento = categorias.filter((c) => !FORA_DO_ORCAMENTO.includes(c.nome))

  useReveal([categorias, gastos])

  const abrir = (categoria: Categoria | null) => {
    setEmEdicao(categoria)
    setSheetAberto(true)
  }

  return (
    <Tela id="view-cats">
      <TituloSecao icone="fa-tags" acessorio={MESES_LONGOS[mes]}>
        Categorias e orçamento do mês
      </TituloSecao>

      <div className="card list-card">
        {doOrcamento.map((c) => {
          const gasto = gastos[c.id] ?? 0
          const teto = c.orcamento_mensal
          const estourou = teto > 0 && gasto > teto
          const pct = teto > 0 ? Math.min((gasto / teto) * 100, 100) : 0
          return (
            <div
              key={c.id}
              className="cat-row"
              role="button"
              tabIndex={0}
              onClick={() => abrir(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') abrir(c)
              }}
            >
              <div className="cat-swatch" style={{ background: `${c.cor}1e`, color: c.cor }}>
                <i className={`fa-solid ${c.icone}`} aria-hidden="true" />
              </div>
              <div className="cat-info">
                <b>
                  {c.nome}
                  {c.protegida ? (
                    <i
                      className="fa-solid fa-lock"
                      style={{ fontSize: 9, marginLeft: 7, color: 'var(--muted-soft)' }}
                      title="Categoria do sistema"
                    />
                  ) : null}
                </b>
                <div className="cat-bar">
                  <div
                    className="cat-fill"
                    style={{ background: estourou ? 'var(--expense)' : c.cor }}
                    data-w={`${pct}%`}
                  />
                </div>
                <span style={estourou ? { color: 'var(--expense)', fontWeight: 600 } : undefined}>
                  {teto > 0
                    ? `${fmtMoeda(gasto)} de ${fmtMoeda(teto)}${estourou ? ' · acima do planejado' : ''}`
                    : `${fmtMoeda(gasto)} · sem orçamento definido`}
                </span>
              </div>
              <i className="fa-solid fa-chevron-right row-chev" aria-hidden="true" />
            </div>
          )
        })}

        {!isLoading && doOrcamento.length === 0 ? (
          <div className="empty">Nenhuma categoria cadastrada ainda.</div>
        ) : null}
      </div>

      <BotaoPill icone="fa-plus" aoClicar={() => abrir(null)}>
        Nova categoria
      </BotaoPill>

      <SheetCategoria
        key={`${emEdicao?.id ?? 'nova'}-${sheetAberto}`}
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        categoria={emEdicao}
      />
    </Tela>
  )
}
