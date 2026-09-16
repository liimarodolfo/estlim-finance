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

  // A fatura tem dois tempos. Aberta, ela acumula as compras do ciclo sozinha e
  // vale a soma delas. Fechada, vale o valor confirmado, e o que sobra do que
  // não foi lançado em detalhe é o que aparece como gasto do cartão.
  const ehFatura = Boolean(l.cartao_id)
  const faturaAberta = Boolean(l.fatura_aberta)
  const itens = l.itens_no_ciclo ?? 0
  const descascada = ehFatura && !faturaAberta && (l.valor_detalhado ?? 0) > 0

  // Passado o dia de fechamento, a fatura espera a confirmação do valor final.
  // O mês corrente vem do relógio local, nunca de toISOString: entre 21h e
  // meia-noite o UTC já está no mês seguinte, e a fatura pareceria fechada
  // antes da hora.
  const agora = new Date()
  const diaHoje = agora.getDate()
  const mesDaLinha = l.data_vencimento?.slice(0, 7) ?? ''
  const mesCorrente = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const jaFechou =
    faturaAberta &&
    l.cartao_fechamento != null &&
    (mesDaLinha < mesCorrente || (mesDaLinha === mesCorrente && diaHoje > l.cartao_fechamento))

  const verbo = aporte ? 'Aplicado' : receita ? 'Recebido' : 'Pago'
  const subtitulo = faturaAberta
    ? `${itens === 0 ? 'Nenhuma compra lançada' : `${itens} compra${itens > 1 ? 's' : ''} lançada${itens > 1 ? 's' : ''}`}${
        l.cartao_fechamento != null ? ` · fecha dia ${l.cartao_fechamento}` : ''
      }${jaFechou ? ' · confirme o valor fechado' : ''}`
    : descascada
    ? `${fmtMoeda(l.valor_detalhado)} lançados em detalhe · ${fmtMoeda(l.valor_exibido)} do cartão`
    : noCredito && pago
      ? `Na fatura de ${mesDaFatura}/${anoDaFatura} · ${fmtMoeda(l.pagamento!.valor_pago)}`
      : pago
        ? `${verbo} em ${fmtData(l.pagamento!.data_pagamento)} às ${fmtHora(l.pagamento!.hora_pagamento)} · ${fmtMoeda(l.pagamento!.valor_pago)}`
        : `${l.data_emissao ? `Emitida ${fmtData(l.data_emissao)} · ` : ''}Vence ${fmtData(l.data_vencimento)}${l.pagar_a ? ` · ${l.pagar_a}` : ''}`

  const semValor = (l.valor_exibido == null && !pago) || jaFechou
  const sinal = aporte ? '↗' : receita ? '+' : '−'
  // Na fatura o número em destaque é o que sai da conta, sempre: aberta, é o
  // acumulado até agora; fechada, é o valor confirmado. O que ela representa em
  // despesa do mês fica no subtítulo, porque parte já está nas linhas das
  // compras.
  const valorMostrado = ehFatura
    ? (l.valor_caixa ?? 0)
    : (l.valor_realizado ?? l.valor_exibido ?? 0)

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
              {faturaAberta ? 'Fatura aberta' : 'Fatura automática'}
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
            <i className={`fa-solid ${jaFechou ? 'fa-file-invoice-dollar' : 'fa-tag'}`} aria-hidden="true" />
            {jaFechou ? 'Confirmar fatura' : 'Adicionar valor'}
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
