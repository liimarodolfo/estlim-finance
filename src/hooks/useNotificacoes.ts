import { fmtData, fmtMoeda } from '@/lib/formatters'
import { useFiltros } from '@/store/useFiltros'
import { useLancamentos, type LancamentoComBaixa } from '@/hooks/useLancamentos'

export type Notificacao = {
  id: string
  icone: string
  fundo: string
  cor: string
  titulo: string
  apoio: string
  /** Quando existe, tocar na notificação abre o sheet de adicionar valor. */
  lancamento?: LancamentoComBaixa
}

const DIAS_DE_AVISO = 7
const umDia = 24 * 60 * 60 * 1000

/**
 * As regras combinadas com o Rodolfo: conta variável sem valor, contas
 * atrasadas, o que vence nos próximos 7 dias, fatura com mais detalhe lançado
 * do que valor, e o que ainda há para receber. Tudo derivado dos lançamentos do
 * mês, sem tabela de notificação no banco.
 */
export function useNotificacoes(): Notificacao[] {
  const mes = useFiltros((e) => e.mes)
  const ano = useFiltros((e) => e.ano)
  const { data: lancamentos = [] } = useLancamentos(mes, ano)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const pendentes = lancamentos.filter((l) => l.status !== 'pago')
  const avisos: Notificacao[] = []

  // 1. Valor variável ainda sem valor: uma notificação por lançamento, porque
  // cada uma leva direto ao campo que falta preencher.
  for (const l of pendentes.filter((x) => x.valor_exibido == null)) {
    avisos.push({
      id: `sem-valor-${l.id}`,
      icone: 'fa-tag',
      fundo: 'rgba(0,153,255,.12)',
      cor: 'var(--accent)',
      titulo: `Adicionar valor: ${l.descricao}`,
      apoio: `Conta variável · vence ${fmtData(l.data_vencimento)} · toque para adicionar`,
      lancamento: l,
    })
  }

  // 2. Atrasadas.
  const atrasadas = pendentes.filter((l) => l.status === 'atrasado')
  for (const l of atrasadas) {
    avisos.push({
      id: `atrasada-${l.id}`,
      icone: 'fa-triangle-exclamation',
      fundo: 'var(--expense-soft)',
      cor: 'var(--expense)',
      titulo: `${l.descricao} está atrasada`,
      apoio: `${fmtMoeda(l.valor_caixa ?? 0)} · vencia ${fmtData(l.data_vencimento)}`,
    })
  }

  // 3. Vence nos próximos 7 dias.
  const naSemana = pendentes.filter((l) => {
    if (l.tipo === 'receita' || !l.data_vencimento) return false
    const venc = new Date(`${l.data_vencimento}T00:00:00`)
    const dias = Math.round((venc.getTime() - hoje.getTime()) / umDia)
    return dias >= 0 && dias <= DIAS_DE_AVISO
  })
  if (naSemana.length) {
    avisos.push({
      id: 'proximos-7-dias',
      icone: 'fa-calendar-day',
      fundo: 'var(--warn-soft)',
      cor: 'var(--warn)',
      titulo: `${naSemana.length} conta${naSemana.length > 1 ? 's' : ''} vence${naSemana.length > 1 ? 'm' : ''} nos próximos 7 dias`,
      apoio: fmtMoeda(naSemana.reduce((s, l) => s + (l.valor_caixa ?? 0), 0)),
    })
  }

  // 4. Fatura com mais detalhe lançado do que o valor digitado no cartão.
  for (const l of lancamentos.filter((x) => x.fatura_estourada)) {
    avisos.push({
      id: `estourada-${l.id}`,
      icone: 'fa-triangle-exclamation',
      fundo: 'var(--warn-soft)',
      cor: 'var(--warn)',
      titulo: `${l.descricao} tem mais detalhe do que valor`,
      apoio: `${fmtMoeda(l.valor_detalhado)} lançados contra ${fmtMoeda(l.valor_caixa)} do cartão`,
    })
  }

  // 5. A receber.
  const aReceber = pendentes.filter((l) => l.tipo === 'receita')
  if (aReceber.length) {
    avisos.push({
      id: 'a-receber',
      icone: 'fa-hand-holding-dollar',
      fundo: 'var(--income-soft)',
      cor: 'var(--income)',
      titulo: `${fmtMoeda(aReceber.reduce((s, l) => s + (l.valor_exibido ?? 0), 0))} a receber`,
      apoio: `${aReceber.length} lançamento${aReceber.length > 1 ? 's' : ''} neste mês`,
    })
  }

  return avisos
}
