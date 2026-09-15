import type { ReactNode } from 'react'
import { fmtDataLocal, fmtMoeda, MESES_LONGOS } from '@/lib/formatters'
import { confetti } from '@/lib/confetti'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useAprovarBalanco, useBalanco } from '@/hooks/useDashboard'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'
import type { Carteira, Categoria, Investimento } from '@/types/database'

type Props = {
  mes: number
  ano: number
  lancamentos: LancamentoComBaixa[]
  categorias: Categoria[]
  investimentos: Investimento[]
  carteiras: Carteira[]
  aoCriarAjuste: () => void
}

const previsto = (arr: LancamentoComBaixa[]) => arr.reduce((s, l) => s + (l.valor_exibido ?? 0), 0)
const realizado = (arr: LancamentoComBaixa[]) =>
  arr.reduce((s, l) => s + (l.pagamento?.valor_pago ?? 0), 0)

/** A variação entre previsto e realizado, verde quando o resultado é bom. */
function Variacao({ real, prev, bomQuandoMenor }: { real: number; prev: number; bomQuandoMenor: boolean }) {
  if (prev === 0 && real === 0) return null
  if (real === 0 && prev > 0) return <small style={{ color: 'var(--muted-soft)' }}>a realizar</small>
  const d = real - prev
  if (Math.abs(d) < 0.005) return <small style={{ color: 'var(--muted)' }}>no previsto</small>
  const bom = bomQuandoMenor ? d < 0 : d > 0
  return (
    <small style={{ color: bom ? 'var(--income)' : 'var(--expense)' }}>
      {d > 0 ? '+' : '−'} {fmtMoeda(Math.abs(d))}
    </small>
  )
}

function Linha({
  nome,
  prev,
  real,
  bomQuandoMenor,
  icone,
  total,
}: {
  nome: string
  prev: number
  real: number
  bomQuandoMenor: boolean
  icone?: ReactNode
  total?: boolean
}) {
  return (
    <div className={total ? 'brow total' : 'brow'}>
      <span className="bn">
        {icone}
        <em>{nome}</em>
      </span>
      <span className="bp">{fmtMoeda(prev)}</span>
      <span className="br">
        {fmtMoeda(real)}
        <Variacao real={real} prev={prev} bomQuandoMenor={bomQuandoMenor} />
      </span>
    </div>
  )
}

const Cabecalho = () => (
  <div className="bl-head">
    <span>Item</span>
    <span>Previsto</span>
    <span>Realizado</span>
  </div>
)

/**
 * Relatório detalhado do mês. Não repete os indicadores do Resumo rápido:
 * aqui é item a item, categoria a categoria, com previsto contra realizado.
 */
export function Balanco({
  mes,
  ano,
  lancamentos,
  categorias,
  investimentos,
  carteiras,
  aoCriarAjuste,
}: Props) {
  const { data: balanco } = useBalanco(mes, ano)
  const aprovar = useAprovarBalanco()

  const receitas = lancamentos.filter((l) => l.tipo === 'receita')
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa')
  const aportes = lancamentos.filter((l) => l.tipo === 'investimento')

  const pr = previsto(receitas)
  const rr = realizado(receitas)
  const pd = previsto(despesas)
  const rd = realizado(despesas)
  const pa = previsto(aportes)
  const ra = realizado(aportes)

  const concluidos = lancamentos.filter((l) => l.status === 'pago').length
  const pctConcluido = lancamentos.length ? Math.round((concluidos / lancamentos.length) * 100) : 0
  const semValor = lancamentos.filter((l) => l.valor_exibido == null && l.status !== 'pago').length

  const aReceber = previsto(receitas.filter((l) => l.status !== 'pago'))
  const aPagar = previsto(despesas.filter((l) => l.status !== 'pago'))
  const aInvestir = previsto(aportes.filter((l) => l.status !== 'pago'))
  const saldoContas = carteiras.filter((c) => c.tipo === 'conta').reduce((s, c) => s + c.saldo, 0)
  const projecao = saldoContas + aReceber - aPagar - aInvestir

  const resultadoReal = rr - rd - ra
  const resultadoPrev = pr - pd - pa
  const taxa = rr > 0 ? Math.round((resultadoReal / rr) * 100) : 0

  // Despesas agrupadas por categoria, da maior previsão para a menor.
  const porCategoria = new Map<string, { cat: Categoria | undefined; prev: number; real: number }>()
  for (const l of despesas) {
    const chave = l.categoria_id ?? 'sem'
    const atual = porCategoria.get(chave) ?? {
      cat: categorias.find((c) => c.id === l.categoria_id),
      prev: 0,
      real: 0,
    }
    atual.prev += l.valor_exibido ?? 0
    atual.real += l.pagamento?.valor_pago ?? 0
    porCategoria.set(chave, atual)
  }

  // Aportes agrupados por investimento de destino.
  const porInvestimento = new Map<string, { nome: string; sub: string | null; prev: number; real: number }>()
  for (const l of aportes) {
    const destino = investimentos.find((i) => i.id === l.investimento_id)
    const chave = destino?.id ?? 'sem'
    const atual = porInvestimento.get(chave) ?? {
      nome: destino?.nome ?? 'Sem destino',
      sub: destino?.sub ?? null,
      prev: 0,
      real: 0,
    }
    atual.prev += l.valor_exibido ?? 0
    atual.real += l.pagamento?.valor_pago ?? 0
    porInvestimento.set(chave, atual)
  }

  const aoAprovar = async (evento: React.MouseEvent<HTMLButtonElement>) => {
    const r = evento.currentTarget.getBoundingClientRect()
    try {
      await aprovar.mutateAsync({
        mes,
        ano,
        resumo: {
          receitasPrevistas: pr,
          receitasRealizadas: rr,
          despesasPrevistas: pd,
          despesasRealizadas: rd,
        },
      })
      confetti(r.left + r.width / 2, r.top)
      toast(`Balanço de ${MESES_LONGOS[mes]} aprovado`, 'fa-check-double')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <div className="card">
      <div className="bal-head">
        <b>
          <i className="fa-solid fa-file-invoice" style={{ marginRight: 8, color: 'var(--muted)' }} aria-hidden="true" />
          Balanço de {MESES_LONGOS[mes]} de {ano}
        </b>
        {balanco?.aprovado ? (
          <span className="tx-status st-pago">
            <i className="fa-solid fa-check" style={{ marginRight: 4 }} aria-hidden="true" />
            Aprovado em {fmtDataLocal(balanco.aprovado_em)}
          </span>
        ) : (
          <span className="tx-status st-pendente">Aguardando aprovação</span>
        )}
      </div>

      <div className="bl-intro">
        <b>
          {concluidos} de {lancamentos.length}
        </b>{' '}
        lançamentos concluídos
        <div className="bal-track">
          <div className="bal-fill" style={{ background: 'var(--primary)' }} data-w={`${pctConcluido}%`} />
        </div>
        <b>{pctConcluido}%</b>
      </div>

      <div className="bl-sec">
        <h4>
          <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
          Receitas
        </h4>
        <Cabecalho />
        {receitas.length === 0 ? (
          <div className="brow">
            <span className="bn">
              <em style={{ color: 'var(--muted)' }}>Nenhuma receita no mês</em>
            </span>
          </div>
        ) : (
          [...receitas]
            .sort((a, b) => (b.valor_exibido ?? 0) - (a.valor_exibido ?? 0))
            .map((l) => (
              <Linha
                key={l.id}
                nome={l.descricao!}
                prev={l.valor_exibido ?? 0}
                real={l.pagamento?.valor_pago ?? 0}
                bomQuandoMenor={false}
              />
            ))
        )}
        <Linha nome="Total de receitas" prev={pr} real={rr} bomQuandoMenor={false} total />
      </div>

      <div className="bl-sec">
        <h4>
          <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
          Despesas por categoria
        </h4>
        <Cabecalho />
        {porCategoria.size === 0 ? (
          <div className="brow">
            <span className="bn">
              <em style={{ color: 'var(--muted)' }}>Nenhuma despesa no mês</em>
            </span>
          </div>
        ) : (
          [...porCategoria.entries()]
            .sort((a, b) => b[1].prev - a[1].prev)
            .map(([chave, g]) => (
              <Linha
                key={chave}
                nome={g.cat?.nome ?? 'Sem categoria'}
                prev={g.prev}
                real={g.real}
                bomQuandoMenor
                icone={
                  <i
                    className={`ci fa-solid ${g.cat?.icone ?? 'fa-tag'}`}
                    style={{ background: `${g.cat?.cor ?? '#6a7681'}1e`, color: g.cat?.cor ?? '#6a7681' }}
                    aria-hidden="true"
                  />
                }
              />
            ))
        )}
        <Linha nome="Total de despesas" prev={pd} real={rd} bomQuandoMenor total />
      </div>

      {aportes.length > 0 ? (
        <div className="bl-sec">
          <h4>
            <i className="fa-solid fa-seedling" aria-hidden="true" />
            Aportes em investimentos
          </h4>
          <Cabecalho />
          {[...porInvestimento.entries()].map(([chave, g]) => (
            <Linha
              key={chave}
              nome={g.nome}
              prev={g.prev}
              real={g.real}
              bomQuandoMenor={false}
              icone={
                <i
                  className={`ci fa-solid ${g.sub === 'caixinha' ? 'fa-piggy-bank' : g.sub === 'ativo' ? 'fa-chart-line' : 'fa-seedling'}`}
                  style={{ background: 'var(--invest-soft)', color: 'var(--invest)' }}
                  aria-hidden="true"
                />
              }
            />
          ))}
          <Linha nome="Total de aportes" prev={pa} real={ra} bomQuandoMenor={false} total />
        </div>
      ) : null}

      <div className="bl-result">
        <div className="bl-kpi">
          <div className="k-l">
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Resultado do mês
          </div>
          <div className="k-v" style={{ color: resultadoReal >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {fmtMoeda(resultadoReal)}
          </div>
          <div className="k-s">previsto {fmtMoeda(resultadoPrev)}</div>
        </div>
        <div className="bl-kpi">
          <div className="k-l">
            <i className="fa-solid fa-piggy-bank" aria-hidden="true" />
            Taxa de economia
          </div>
          <div className="k-v" style={{ color: taxa >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {taxa}%
          </div>
          <div className="k-s">do que foi recebido</div>
        </div>
        <div className="bl-kpi">
          <div className="k-l">
            <i className="fa-solid fa-tag" aria-hidden="true" />
            Precisão
          </div>
          <div className="k-v">{semValor ? semValor : '100%'}</div>
          <div className="k-s">
            {semValor
              ? `conta${semValor > 1 ? 's' : ''} sem valor definido`
              : 'todos os valores definidos'}
          </div>
        </div>
      </div>

      <div className="prev-final">
        <div className="pf-l">
          Fechamento projetado
          <small>Com o que ainda falta acontecer neste mês</small>
        </div>
        <div className="pf-v" style={{ color: projecao >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {fmtMoeda(projecao)}
        </div>
      </div>
      <div className="bl-formula">
        Saldo em contas hoje <b>{fmtMoeda(saldoContas)}</b> + a receber <b>{fmtMoeda(aReceber)}</b> − a
        pagar <b>{fmtMoeda(aPagar)}</b>
        {aInvestir ? (
          <>
            {' '}
            − aportes <b>{fmtMoeda(aInvestir)}</b>
          </>
        ) : null}
      </div>

      <div className="bal-actions">
        {balanco?.aprovado ? null : (
          <button type="button" className="btn-sm approve" onClick={aoAprovar} disabled={aprovar.isPending}>
            <i className="fa-solid fa-check-double" aria-hidden="true" />
            Aprovar balanço
          </button>
        )}
        <button type="button" className="btn-sm ghost" onClick={aoCriarAjuste}>
          <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
          Criar ajuste
        </button>
      </div>
    </div>
  )
}
