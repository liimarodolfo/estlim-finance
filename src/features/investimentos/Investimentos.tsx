import { useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { CardGradiente } from '@/ui/CardGradiente'
import { NumeroAnimado } from '@/ui/NumeroAnimado'
import { MiniBadge } from '@/ui/MiniBadge'
import { LogoMarca } from '@/ui/LogoMarca'
import { useReveal } from '@/ui/useReveal'
import { fmtMoeda } from '@/lib/formatters'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCorretoras, useInvestimentos } from '@/hooks/useInvestimentos'
import { SheetInvestimento } from '@/features/investimentos/SheetInvestimento'
import { SheetCorretora } from '@/features/investimentos/SheetCorretora'
import { iniciaisCorretora } from '@/lib/corretoras'
import type { Investimento, SubInvestimento } from '@/types/database'

const GRAD_INVEST = 'linear-gradient(135deg,#3b1f9e 0%,#6d4aff 45%,#a78bfa 100%)'

const ROTULO: Record<SubInvestimento, string> = { ativo: 'Ativo', caixinha: 'Caixinha' }
const ICONE: Record<SubInvestimento, string> = {
  ativo: 'fa-chart-line',
  caixinha: 'fa-piggy-bank',
}

type Filtro = 'todos' | SubInvestimento

export default function Investimentos() {
  const { data: investimentos = [], isLoading } = useInvestimentos()
  const { data: corretoras = [] } = useCorretoras()
  const { data: carteiras = [] } = useCarteiras()

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sheetAberto, setSheetAberto] = useState(false)
  const [corretoraAberta, setCorretoraAberta] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Investimento | null>(null)

  const somar = (sub?: SubInvestimento) =>
    investimentos.filter((i) => !sub || i.sub === sub).reduce((s, i) => s + i.valor, 0)

  const total = somar()
  const grupos: SubInvestimento[] = filtro === 'todos' ? ['ativo', 'caixinha'] : [filtro]

  useReveal([investimentos, filtro])

  const nomeDaInstituicao = (iv: Investimento) => {
    if (iv.instituicao_tipo === 'corretora') {
      return corretoras.find((c) => c.id === iv.corretora_id)?.nome ?? 'Corretora'
    }
    return carteiras.find((c) => c.id === iv.carteira_id)?.nome ?? 'Conta'
  }

  const logoDaInstituicao = (iv: Investimento) => {
    if (iv.instituicao_tipo === 'corretora') {
      const c = corretoras.find((x) => x.id === iv.corretora_id)
      if (!c) return <LogoMarca marca={null} tamanho={44} rotulo="?" />
      return (
        <div className="brand-logo" style={{ background: c.logoAssinado ? '#fff' : c.cor, width: 44, height: 44 }}>
          {c.logoAssinado ? <img src={c.logoAssinado} alt={c.nome} /> : iniciaisCorretora(c.nome)}
        </div>
      )
    }
    const conta = carteiras.find((c) => c.id === iv.carteira_id)
    return (
      <LogoMarca
        marca={conta?.banco ?? null}
        tamanho={44}
        fundo={conta?.banco === 'custom' ? conta.cor_gradiente : null}
        rotulo={conta?.banco === 'custom' ? (conta.banco_nome ?? '').slice(0, 3) : null}
      />
    )
  }

  const abrir = (iv: Investimento | null) => {
    setEmEdicao(iv)
    setSheetAberto(true)
  }

  return (
    <Tela id="view-invest">
      <CardGradiente variante="carteira" gradiente={GRAD_INVEST}>
        <div className="hero-label">Patrimônio investido</div>
        <NumeroAnimado valor={total} className="hero-value" como="div" />
        <div className="hero-sub">
          {investimentos.length} investimento{investimentos.length === 1 ? '' : 's'} em contas e
          corretoras
        </div>
        <div className="ws-row">
          <div className="ws-item">
            <b>{fmtMoeda(somar('ativo'))}</b>
            <span>
              <i className="fa-solid fa-chart-line" aria-hidden="true" />
              Ativos
            </span>
          </div>
          <div className="ws-item">
            <b>{fmtMoeda(somar('caixinha'))}</b>
            <span>
              <i className="fa-solid fa-piggy-bank" aria-hidden="true" />
              Caixinhas
            </span>
          </div>
        </div>
      </CardGradiente>

      <div className="owner-filters">
        <Chip ativo={filtro === 'todos'} icone="fa-layer-group" aoClicar={() => setFiltro('todos')}>
          Todos
        </Chip>
        <Chip ativo={filtro === 'ativo'} icone="fa-chart-line" aoClicar={() => setFiltro('ativo')}>
          Ativos
        </Chip>
        <Chip
          ativo={filtro === 'caixinha'}
          icone="fa-piggy-bank"
          aoClicar={() => setFiltro('caixinha')}
        >
          Caixinhas
        </Chip>
      </div>

      <div id="investBody">
        {grupos.map((g) => {
          const doGrupo = investimentos.filter((i) => i.sub === g)
          if (!doGrupo.length) return null
          return (
            <section className="inv-block" key={g}>
              <div className="inv-head">
                <span className="st-l">
                  <i className={`fa-solid ${ICONE[g]}`} aria-hidden="true" />
                  {ROTULO[g]}s <em className="inv-count">{doGrupo.length}</em>
                </span>
                <span className="inv-total">{fmtMoeda(somar(g))}</span>
              </div>
              <div className="card list-card">
                {doGrupo.map((iv, i) => (
                  <div
                    key={iv.id}
                    className="inv-row"
                    style={{ animationDelay: `${i * 40}ms` }}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrir(iv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') abrir(iv)
                    }}
                  >
                    {logoDaInstituicao(iv)}
                    <div className="inv-info">
                      <b>{iv.nome}</b>
                      <span>{iv.descricao || '--'}</span>
                      <div className="tx-badges">
                        <MiniBadge tom="inv" icone={ICONE[iv.sub]}>
                          {ROTULO[iv.sub]}
                        </MiniBadge>
                        <MiniBadge>{nomeDaInstituicao(iv)}</MiniBadge>
                        {iv.rentabilidade ? <MiniBadge tom="var">{iv.rentabilidade}</MiniBadge> : null}
                        <MiniBadge>{iv.dono}</MiniBadge>
                      </div>
                    </div>
                    <div className="inv-val">
                      <b style={{ color: 'var(--invest)' }}>{fmtMoeda(iv.valor)}</b>
                    </div>
                    <i className="fa-solid fa-chevron-right row-chev" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {!isLoading && investimentos.length === 0 ? (
          <div className="card">
            <div className="empty">
              <i
                className="fa-solid fa-seedling"
                style={{ fontSize: 22, display: 'block', marginBottom: 10, color: 'var(--invest)' }}
                aria-hidden="true"
              />
              Nenhum investimento cadastrado ainda.
              <br />
              Comece pelos botões abaixo.
            </div>
          </div>
        ) : null}
      </div>

      <div className="bal-actions" style={{ marginTop: 22 }}>
        <button type="button" className="btn-sm ghost" onClick={() => abrir(null)}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          Novo investimento
        </button>
        <button type="button" className="btn-sm ghost" onClick={() => setCorretoraAberta(true)}>
          <i className="fa-solid fa-building-columns" aria-hidden="true" />
          Corretoras
        </button>
      </div>

      <SheetInvestimento
        key={`${emEdicao?.id ?? 'novo'}-${sheetAberto}`}
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        investimento={emEdicao}
        aoPedirCorretora={() => {
          // Um sheet de cada vez: o de investimento sai para o de corretora entrar.
          setSheetAberto(false)
          setCorretoraAberta(true)
        }}
      />

      <SheetCorretora
        key={`corretora-${corretoraAberta}`}
        aberto={corretoraAberta}
        aoFechar={() => setCorretoraAberta(false)}
      />
    </Tela>
  )
}
