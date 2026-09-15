import { CheckCircle } from '@/ui/CheckCircle'
import { MiniBadge } from '@/ui/MiniBadge'
import { StatusBadge } from '@/ui/StatusBadge'
import { fmtData, fmtHora, fmtMoeda, MESES } from '@/lib/formatters'
import { METODO_ICONE, rotuloDaForma } from '@/lib/formas'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'
import type { Carteira, Categoria, Investimento } from '@/types/database'

type Props = {
  lancamento: LancamentoComBaixa
  indice: number
  categoria: Categoria | undefined
  carteiras: Carteira[]
  investimento: Investimento | undefined
  destacado: boolean
  aoAbrir: () => void
  aoMarcar: (evento: React.MouseEvent<HTMLButtonElement>) => void
  aoExcluir: () => void
  aoAdicionarValor: () => void
}

export function LinhaLancamento({
  lancamento: l,
  indice,
  categoria,
  carteiras,
  investimento,
  destacado,
  aoAbrir,
  aoMarcar,
  aoExcluir,
  aoAdicionarValor,
}: Props) {
  const aporte = l.tipo === 'investimento'
  const receita = l.tipo === 'receita'
  const pago = l.status === 'pago' && l.pagamento !== null
  const cor = categoria?.cor ?? '#6a7681'
  const icone = categoria?.icone ?? (aporte ? 'fa-seedling' : 'fa-tag')

  // A despesa no crédito não saiu de conta nenhuma: ela entrou na fatura.
  const noCredito = l.forma_metodo === 'credito' && !l.cartao_id
  const mesDaFatura = MESES[new Date(`${l.data_vencimento}T12:00:00`).getMonth()]
  const anoDaFatura = l.data_vencimento?.slice(0, 4) ?? ''

  // A fatura vale o que o cartão ainda não teve detalhado. Sem dizer isso, o
  // valor menor do que o da carteira parece defeito.
  const ehFatura = Boolean(l.cartao_id)
  const descascada = ehFatura && (l.valor_detalhado ?? 0) > 0

  const verbo = aporte ? 'Aplicado' : receita ? 'Recebido' : 'Pago'
  const subtitulo = descascada
    ? `Fatura ${fmtMoeda(l.valor_caixa)} · ${fmtMoeda(l.valor_detalhado)} já lançados em detalhe`
    : noCredito && pago
      ? `Na fatura de ${mesDaFatura}/${anoDaFatura} · ${fmtMoeda(l.pagamento!.valor_pago)}`
      : pago
        ? `${verbo} em ${fmtData(l.pagamento!.data_pagamento)} às ${fmtHora(l.pagamento!.hora_pagamento)} · ${fmtMoeda(l.pagamento!.valor_pago)}`
        : `${l.data_emissao ? `Emitida ${fmtData(l.data_emissao)} · ` : ''}Vence ${fmtData(l.data_vencimento)}${l.pagar_a ? ` · ${l.pagar_a}` : ''}`

  const semValor = l.valor_exibido == null && !pago
  const sinal = aporte ? '↗' : receita ? '+' : '−'
  const valorMostrado = l.valor_realizado ?? l.valor_exibido ?? 0

  const rotuloCheck = aporte ? 'aplicado' : receita ? 'recebido' : 'pago'
  const natureza =
    l.parcela_atual && l.parcela_total
      ? { texto: `${l.parcela_atual}/${l.parcela_total}`, tom: 'parc' as const }
      : l.natureza === 'fixa'
        ? { texto: 'Fixa', tom: 'fixa' as const }
        : { texto: 'Avulsa', tom: 'neutro' as const }

  return (
    <div
      className={`tx${destacado ? ' paid-flash' : ''}`}
      style={{ animationDelay: `${indice * 35}ms` }}
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter') aoAbrir()
      }}
    >
      <CheckCircle
        concluido={pago}
        rotulo={rotuloCheck}
        aoClicar={(e) => {
          e.stopPropagation()
          aoMarcar(e)
        }}
      />

      <div className="tx-icon" style={{ background: `${cor}1e`, color: cor }}>
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
      </div>

      <div className="tx-info">
        <b>{l.descricao}</b>
        <span>{subtitulo}</span>
        <div className="tx-badges">
          <MiniBadge tom={natureza.tom}>{natureza.texto}</MiniBadge>
          {ehFatura ? (
            <MiniBadge tom="fat" icone="fa-credit-card">
              Fatura automática
            </MiniBadge>
          ) : null}
          {l.fatura_estourada ? (
            <MiniBadge tom="var" icone="fa-triangle-exclamation">
              Confira o valor
            </MiniBadge>
          ) : null}
          {noCredito && pago ? (
            <MiniBadge tom="fat" icone="fa-receipt">
              Na fatura
            </MiniBadge>
          ) : null}
          {investimento ? (
            <MiniBadge tom="inv" icone={investimento.sub === 'ativo' ? 'fa-chart-line' : 'fa-piggy-bank'}>
              {investimento.nome}
            </MiniBadge>
          ) : null}
          {l.tipo_valor === 'variavel' ? <MiniBadge tom="var">Variável</MiniBadge> : null}
          <MiniBadge tom="metodo" icone={l.forma_metodo ? METODO_ICONE[l.forma_metodo] : 'fa-wallet'}>
            {rotuloDaForma(l.forma_metodo, l.forma_ref, carteiras)}
          </MiniBadge>
          <MiniBadge>{l.dono}</MiniBadge>
        </div>
      </div>

      <div className={`tx-val ${aporte ? 'inv' : receita ? 'pos' : 'neg'}`}>
        {semValor ? (
          <b
            className="no-price"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              aoAdicionarValor()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                aoAdicionarValor()
              }
            }}
          >
            <i className="fa-solid fa-tag" aria-hidden="true" />
            Adicionar valor
          </b>
        ) : (
          <b>
            {sinal} {fmtMoeda(valorMostrado)}
          </b>
        )}
        <StatusBadge status={l.status!} tipo={l.tipo} />
      </div>

      <div className="tx-actions">
        <button
          type="button"
          className="mini-btn"
          title="Excluir"
          aria-label={`Excluir ${l.descricao}`}
          onClick={(e) => {
            e.stopPropagation()
            aoExcluir()
          }}
        >
          <i className="fa-solid fa-trash" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
