import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { CardGradiente } from '@/ui/CardGradiente'
import { NumeroAnimado } from '@/ui/NumeroAnimado'
import { CheckCircle } from '@/ui/CheckCircle'
import { StatusBadge } from '@/ui/StatusBadge'
import { useReveal } from '@/ui/useReveal'
import { fmtData, fmtMoeda, MESES_LONGOS } from '@/lib/formatters'
import { rotuloDaForma } from '@/lib/formas'
import { useFiltros } from '@/store/useFiltros'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCategorias } from '@/hooks/useCategorias'
import { useInvestimentos } from '@/hooks/useInvestimentos'
import { useLancamentos, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import { useHistorico } from '@/hooks/useDashboard'
import { useFluxoDeBaixa } from '@/hooks/useFluxoDeBaixa'
import { Donut, type FatiaDoDonut } from '@/features/dashboard/Donut'
import { Barras } from '@/features/dashboard/Barras'
import { Balanco } from '@/features/dashboard/Balanco'
import { SheetAjuste } from '@/features/carteira/SheetAjuste'

/** Uma linha do detalhamento: de onde vem a parcela daquele total. */
type Parcela = { chave: string; nome: string; apoio?: string; valor: number }

function Indicador({
  icone,
  cor,
  rotulo,
  valor,
  apoio,
  direcao,
  detalhe,
}: {
  icone: string
  cor: string
  rotulo: string
  valor: number
  apoio: string
  direcao?: 'up' | 'down'
  /** Abre um balão dizendo de onde sai o total. Sem isso, o card nao tem botao. */
  detalhe?: Parcela[]
}) {
  const corApoio =
    direcao === 'up' ? 'var(--income)' : direcao === 'down' ? 'var(--expense)' : 'var(--muted)'
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  // Fecha ao tocar fora e no Esc. Sem isso o balao ficaria presente no celular,
  // onde nao existe sair com o mouse.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  return (
    <div className="card stat-card" ref={caixa}>
      <span className="sc-ico" style={{ background: `${cor}1e`, color: cor }}>
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
      </span>
      <div className="sc-body">
        <span className="sc-lbl">{rotulo}</span>
        <div className="sc-val">
          <NumeroAnimado valor={valor} como="b" />
          <i className="trend" style={{ color: corApoio }}>
            {direcao ? (
              <i className={`fa-solid fa-arrow-trend-${direcao}`} aria-hidden="true" />
            ) : null}
            {apoio}
          </i>
        </div>
      </div>

      {detalhe ? (
        <>
          <button
            type="button"
            className="sc-abrir"
            aria-expanded={aberto}
            title={`Onde esta: ${rotulo}`}
            aria-label={`Onde esta: ${rotulo}`}
            onClick={() => setAberto((a) => !a)}
          >
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
          </button>

          {aberto ? (
            <div className="sc-detalhe" role="dialog" aria-label={`Detalhe de ${rotulo}`}>
              {detalhe.length === 0 ? (
                <div className="sc-vazio">Nada por aqui ainda.</div>
              ) : (
                detalhe.map((d) => (
                  <div key={d.chave} className="sc-item">
                    <div className="sc-item-nome">
                      <b>{d.nome}</b>
                      {d.apoio ? <span>{d.apoio}</span> : null}
                    </div>
                    <b className="sc-item-valor">{fmtMoeda(d.valor)}</b>
                  </div>
                ))
              )}
              <div className="sc-item sc-total">
                <div className="sc-item-nome">
                  <b>Total</b>
                </div>
                <b className="sc-item-valor">{fmtMoeda(valor)}</b>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default function Dashboard() {
  const mes = useFiltros((e) => e.mes)
  const ano = useFiltros((e) => e.ano)
  const navigate = useNavigate()

  const { data: lancamentos = [] } = useLancamentos(mes, ano)
  const { data: categorias = [] } = useCategorias()
  const { data: carteiras = [] } = useCarteiras()
  const { data: investimentos = [] } = useInvestimentos()
  const { data: historico = [] } = useHistorico(mes, ano)
  const { marcar, abrirValor, recemPago, sheets } = useFluxoDeBaixa()

  const [ajusteAberto, setAjusteAberto] = useState(false)

  const receitas = lancamentos.filter((l) => l.tipo === 'receita')
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa')
  const aportes = lancamentos.filter((l) => l.tipo === 'investimento')

  // Previsto é de competência: na fatura do cartão vale o líquido, já sem o que
  // foi lançado em detalhe. Caixa é quanto ainda sai da conta, e aí a fatura
  // vale cheia, porque é isso que o banco cobra.
  const somaPrevista = (arr: LancamentoComBaixa[]) =>
    arr.reduce((s, l) => s + (l.valor_exibido ?? 0), 0)
  const somaCaixa = (arr: LancamentoComBaixa[]) =>
    arr.reduce((s, l) => s + (l.valor_caixa ?? 0), 0)

  // Realizado é o que de fato passou pela conta, pela mesma regra do Balanço e
  // dos Relatórios: previsto é valor_exibido, realizado é valor_realizado.
  const somaRealizada = (arr: LancamentoComBaixa[]) =>
    arr.reduce((s, l) => s + (l.valor_realizado ?? 0), 0)

  const totalReceitas = somaPrevista(receitas)
  // Aporte não entra em despesa: é transferência de patrimônio, não consumo.
  const totalDespesas = somaPrevista(despesas)
  const recebido = somaRealizada(receitas)
  const jaPago = somaRealizada(despesas)
  const pendentes = despesas.filter((l) => l.status !== 'pago')
  const aReceber = receitas.filter((l) => l.status !== 'pago')
  const atrasados = lancamentos.filter((l) => l.status === 'atrasado')
  const semValor = lancamentos.filter((l) => l.valor_exibido == null && l.status !== 'pago')
  // Detalhado maior que o valor digitado no cartão: ou falta atualizar a fatura
  // na Carteira, ou alguma compra foi lançada no cartão errado.
  const faturasEstouradas = lancamentos.filter((l) => l.fatura_estourada)

  const contas = useMemo(() => carteiras.filter((c) => c.tipo === 'conta'), [carteiras])
  const saldoContas = contas.reduce((s, c) => s + c.saldo, 0)

  // O total sozinho nao diz onde o dinheiro esta, e com contas de donos
  // diferentes isso muda a leitura: o mesmo saldo pode estar todo na PJ. Maior
  // primeiro, porque a pergunta e sempre "onde esta a maior parte".
  const detalheDasContas = useMemo(
    () =>
      [...contas]
        .sort((a, b) => b.saldo - a.saldo)
        .map((c) => ({ chave: c.id, nome: c.nome, apoio: c.dono, valor: c.saldo })),
    [contas],
  )
  const cartoes = carteiras.filter((c) => c.tipo === 'cartao')
  const usadoCartoes = cartoes.reduce((s, c) => s + c.usado, 0)
  const limiteTotal = cartoes.reduce((s, c) => s + c.limite, 0)
  const patrimonio = investimentos.reduce((s, i) => s + i.valor, 0)
  const aportesDoMes = aportes.reduce(
    (s, l) => s + (l.valor_realizado ?? l.valor_exibido ?? 0),
    0,
  )

  // Gastos agrupados por categoria, do maior para o menor. Conta barata, feita
  // no render mesmo: sao dezenas de linhas, nao milhares.
  const porCategoria = new Map<string, FatiaDoDonut>()
  for (const l of despesas) {
    const cat = categorias.find((c) => c.id === l.categoria_id)
    const chave = cat?.id ?? 'sem'
    const atual = porCategoria.get(chave) ?? {
      id: chave,
      nome: cat?.nome ?? 'Sem categoria',
      cor: cat?.cor ?? '#6a7681',
      icone: cat?.icone ?? 'fa-tag',
      valor: 0,
    }
    atual.valor += l.valor_exibido ?? 0
    porCategoria.set(chave, atual)
  }
  const fatias: FatiaDoDonut[] = [...porCategoria.values()]
    .filter((f) => f.valor > 0)
    .sort((a, b) => b.valor - a.valor)

  const proximos = [...pendentes]
    .sort((a, b) => (a.data_vencimento ?? '').localeCompare(b.data_vencimento ?? ''))
    .slice(0, 4)

  useReveal([lancamentos, categorias, carteiras, historico])

  return (
    <Tela id="view-home">
      <CardGradiente>
        <div className="hero-label">
          Saldo previsto de {MESES_LONGOS[mes]} de {ano}
        </div>
        <NumeroAnimado valor={totalReceitas - totalDespesas} className="hero-value" como="div" />
        {/* A linha de apoio saiu: ela repetia, em texto corrido, os dois
            numeros que ja estavam logo abaixo em destaque. */}
        <div className="hero-stats hero-quatro">
          <div className="hero-stat">
            <b>{fmtMoeda(totalReceitas)}</b>
            <span>
              <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
              Receitas previstas
            </span>
          </div>
          <div className="hero-stat">
            <b>{fmtMoeda(totalDespesas)}</b>
            <span>
              <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
              Despesas previstas
            </span>
          </div>
          <div className="hero-stat">
            <b>{fmtMoeda(recebido)}</b>
            <span>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              Saldo já recebido
            </span>
          </div>
          <div className="hero-stat">
            <b>{fmtMoeda(jaPago)}</b>
            <span>
              <i className="fa-solid fa-receipt" aria-hidden="true" />
              Despesas já pagas
            </span>
          </div>
        </div>
      </CardGradiente>

      <TituloSecao icone="fa-gauge-high" style={{ marginTop: 32 }}>
        Resumo rápido
      </TituloSecao>
      <div className="grid2" id="quickStats">
        <Indicador icone="fa-building-columns" cor="var(--income)" rotulo="Saldo em contas" valor={saldoContas} apoio={`${contas.length} conta${contas.length === 1 ? '' : 's'}`} detalhe={detalheDasContas} />
        <Indicador icone="fa-hourglass-half" cor="var(--warn)" rotulo="A pagar no mês" valor={somaCaixa(pendentes)} apoio={`${pendentes.length} pendência${pendentes.length === 1 ? '' : 's'}`} />
        <Indicador icone="fa-credit-card" cor="var(--expense)" rotulo="Usado nos cartões" valor={usadoCartoes} apoio={limiteTotal ? `${Math.round((usadoCartoes / limiteTotal) * 100)}% do limite` : 'sem cartão'} />
        <Indicador icone="fa-hand-holding-dollar" cor="var(--income)" rotulo="A receber no mês" valor={somaPrevista(aReceber)} apoio={`${aReceber.length} pendente${aReceber.length === 1 ? '' : 's'}`} />
        <Indicador icone="fa-seedling" cor="var(--invest)" rotulo="Patrimônio investido" valor={patrimonio} apoio={`${investimentos.length} aplicaç${investimentos.length === 1 ? 'ão' : 'ões'}`} />
        <Indicador icone="fa-sack-dollar" cor="var(--invest)" rotulo="Aportes do mês" valor={aportesDoMes} apoio={`${aportes.filter((l) => l.status !== 'pago').length} a investir`} />
      </div>

      <div className="charts-duo">
        <div className="chart-block">
          <TituloSecao icone="fa-chart-pie">Gastos por categoria</TituloSecao>
          <div className="card">
            <Donut fatias={fatias} />
          </div>
        </div>
        <div className="chart-block">
          <TituloSecao icone="fa-chart-column" acessorio="últimos 6 meses">
            Receitas x Despesas
          </TituloSecao>
          <div className="card">
            <Barras meses={historico} />
          </div>
        </div>
      </div>

      <TituloSecao icone="fa-calendar-days" acessorio="ver agenda">
        Próximos vencimentos
      </TituloSecao>
      <div className="card list-card">
        {proximos.length === 0 ? (
          <div className="empty">
            <i className="fa-solid fa-champagne-glasses" aria-hidden="true" /> Nenhum vencimento
            pendente
          </div>
        ) : (
          proximos.map((l) => {
            const cat = categorias.find((c) => c.id === l.categoria_id)
            return (
              <div
                className={`tx${recemPago === l.id ? ' paid-flash' : ''}`}
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/lancamentos')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate('/lancamentos')
                }}
              >
                <CheckCircle
                  concluido={false}
                  rotulo="pago"
                  aoClicar={(e) => {
                    e.stopPropagation()
                    marcar(l, e)
                  }}
                />
                <div
                  className="tx-icon"
                  style={{ background: `${cat?.cor ?? '#6a7681'}1e`, color: cat?.cor ?? '#6a7681' }}
                >
                  <i className={`fa-solid ${cat?.icone ?? 'fa-tag'}`} aria-hidden="true" />
                </div>
                <div className="tx-info">
                  <b>{l.descricao}</b>
                  <span>
                    Vence {fmtData(l.data_vencimento)}
                    {l.pagar_a ? ` · ${l.pagar_a}` : ''} ·{' '}
                    {rotuloDaForma(l.forma_metodo, l.forma_ref, carteiras)}
                  </span>
                </div>
                <div className="tx-val neg">
                  {l.valor_exibido == null ? (
                    <b
                      className="no-price"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirValor(l)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          abrirValor(l)
                        }
                      }}
                    >
                      <i className="fa-solid fa-tag" aria-hidden="true" />
                      Adicionar valor
                    </b>
                  ) : (
                    <b>{fmtMoeda(l.valor_exibido)}</b>
                  )}
                  <StatusBadge status={l.status!} tipo={l.tipo} />
                </div>
              </div>
            )
          })
        )}
      </div>

      <TituloSecao icone="fa-bolt">Destaques</TituloSecao>
      <div>
        {semValor.length > 0 ? (
          <div
            className="alert warn"
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onClick={() => abrirValor(semValor[0])}
            onKeyDown={(e) => {
              if (e.key === 'Enter') abrirValor(semValor[0])
            }}
          >
            <i className="fa-solid fa-tag" aria-hidden="true" />
            <div>
              <b>
                {semValor.length} conta{semValor.length > 1 ? 's' : ''} variáve
                {semValor.length > 1 ? 'is' : 'l'}
              </b>{' '}
              sem valor definido · toque para adicionar
            </div>
          </div>
        ) : null}

        {faturasEstouradas.map((l) => (
          <div
            className="alert"
            key={`estourada-${l.id}`}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/carteira')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/carteira')
            }}
            style={{ background: 'var(--warn-soft)', color: 'var(--warn)', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <div>
              <b>{l.descricao}</b> tem {fmtMoeda(l.valor_detalhado)} lançados em detalhe, mais do que
              os {fmtMoeda(l.valor_caixa)} do cartão · toque para conferir na Carteira
            </div>
          </div>
        ))}

        {atrasados.map((l) => (
          <div className="alert danger" key={l.id}>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <div>
              <b>{l.descricao}</b> está atrasada · {fmtMoeda(l.valor_caixa ?? 0)} · vencia{' '}
              {fmtData(l.data_vencimento)}
            </div>
          </div>
        ))}

        {aportes.filter((l) => l.status !== 'pago').length > 0 ? (
          <div className="alert" style={{ background: 'var(--invest-soft)', color: 'var(--invest)' }}>
            <i className="fa-solid fa-seedling" aria-hidden="true" />
            <div>
              <b>{fmtMoeda(somaPrevista(aportes.filter((l) => l.status !== 'pago')))}</b> em aportes
              previstos neste mês
            </div>
          </div>
        ) : null}

        {aReceber.length > 0 ? (
          <div className="alert ok">
            <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />
            <div>
              <b>{fmtMoeda(somaPrevista(aReceber))}</b> ainda a receber neste mês
            </div>
          </div>
        ) : null}

        {semValor.length === 0 &&
        atrasados.length === 0 &&
        aReceber.length === 0 &&
        faturasEstouradas.length === 0 ? (
          <div className="alert ok">
            <i className="fa-solid fa-check" aria-hidden="true" />
            <div>Tudo em dia por aqui</div>
          </div>
        ) : null}
      </div>

      <TituloSecao icone="fa-scale-balanced">Balanço do mês</TituloSecao>
      <Balanco
        mes={mes}
        ano={ano}
        lancamentos={lancamentos}
        categorias={categorias}
        investimentos={investimentos}
        carteiras={carteiras}
        aoCriarAjuste={() => setAjusteAberto(true)}
      />

      <SheetAjuste
        key={`ajuste-dash-${ajusteAberto}`}
        aberto={ajusteAberto}
        aoFechar={() => setAjusteAberto(false)}
        contas={carteiras.filter((c) => c.tipo === 'conta')}
      />

      {sheets}
    </Tela>
  )
}
