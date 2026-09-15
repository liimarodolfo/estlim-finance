import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { intervaloDoMes } from '@/lib/formatters'
import type {
  Dono,
  LancTipo,
  LancamentoExibido,
  MetodoPagamento,
  Natureza,
  Pagamento,
  TipoValor,
} from '@/types/database'

export type LancamentoComBaixa = LancamentoExibido & { pagamento: Pagamento | null }

export type DadosLancamento = {
  tipo: LancTipo
  descricao: string
  pagar_a: string | null
  natureza: Natureza
  tipo_valor: TipoValor
  valor_previsto: number | null
  data_emissao: string | null
  data_vencimento: string
  categoria_id: string | null
  forma_metodo: MetodoPagamento | null
  forma_ref: string | null
  dono: Dono
  investimento_id: string | null
  parcelas: number
}

/** Lançamentos do mês, já com o valor da fatura sincronizado pela view. */
export function useLancamentos(mes: number, ano: number) {
  return useQuery({
    queryKey: ['lancamentos', mes, ano],
    queryFn: async (): Promise<LancamentoComBaixa[]> => {
      const { inicio, fim } = intervaloDoMes(mes, ano)
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('*')
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
        .order('data_vencimento')
      if (error) throw comoErro(error)

      const ids = data.map((l) => l.id).filter((id): id is string => id !== null)
      if (ids.length === 0) return data.map((l) => ({ ...l, pagamento: null }))

      const { data: baixas, error: erroBaixas } = await supabase
        .from('pagamentos')
        .select('*')
        .in('lancamento_id', ids)
      if (erroBaixas) throw comoErro(erroBaixas)

      const porLancamento = new Map(baixas.map((p) => [p.lancamento_id, p]))
      return data.map((l) => ({ ...l, pagamento: (l.id && porLancamento.get(l.id)) || null }))
    },
  })
}

function invalidarTudo(qc: ReturnType<typeof useQueryClient>) {
  // Uma baixa mexe em lançamento, carteira (fatura), investimento (aporte) e
  // no consumo da categoria. Invalida todos, que é barato e nunca mente.
  qc.invalidateQueries({ queryKey: ['lancamentos'] })
  qc.invalidateQueries({ queryKey: ['carteiras'] })
  qc.invalidateQueries({ queryKey: ['investimentos'] })
  qc.invalidateQueries({ queryKey: ['gastos-por-categoria'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCriarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: DadosLancamento) => {
      const { error } = await supabase.rpc('fn_criar_lancamentos', {
        p_tipo: dados.tipo,
        p_descricao: dados.descricao,
        p_pagar_a: dados.pagar_a,
        p_natureza: dados.natureza,
        p_tipo_valor: dados.tipo_valor,
        p_valor: dados.valor_previsto,
        p_data_emissao: dados.data_emissao,
        p_data_vencimento: dados.data_vencimento,
        p_categoria_id: dados.categoria_id,
        p_forma_metodo: dados.forma_metodo,
        p_forma_ref: dados.forma_ref,
        p_dono: dados.dono,
        p_investimento_id: dados.investimento_id,
        p_parcelas: dados.parcelas,
      })
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}

export function useAtualizarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Omit<DadosLancamento, 'parcelas'> }) => {
      const { parcelas: _ignorado, ...resto } = { ...dados, parcelas: 1 }
      void _ignorado
      const { error } = await supabase.from('lancamentos').update(resto).eq('id', id)
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}

export function useExcluirLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos').delete().eq('id', id)
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}

/** Só preenche o valor previsto, para o selo "Adicionar valor" sair da lista. */
export function useDefinirValor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase
        .from('lancamentos')
        .update({ valor_previsto: valor })
        .eq('id', id)
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}

export type DadosBaixa = {
  lancamentoId: string
  dataPagamento: string
  horaPagamento: string
  valorPago: number
  formaMetodo: MetodoPagamento | null
  formaRef: string | null
}

/**
 * Registra a baixa. A data e a hora vêm de quem chamou, que é sempre o momento
 * do clique no check. O status, a zeragem do limite do cartão e a soma no
 * investimento acontecem por gatilho, na mesma transação do insert.
 */
export function useDarBaixa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: DadosBaixa) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('pagamentos').insert({
        lancamento_id: dados.lancamentoId,
        data_pagamento: dados.dataPagamento,
        hora_pagamento: dados.horaPagamento,
        valor_pago: dados.valorPago,
        forma_metodo: dados.formaMetodo,
        forma_ref: dados.formaRef,
        confirmado_por: auth.user?.id ?? null,
      })
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}

export function useDesfazerBaixa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lancamentoId: string) => {
      const { error } = await supabase.from('pagamentos').delete().eq('lancamento_id', lancamentoId)
      if (error) throw comoErro(error)
    },
    onSuccess: () => invalidarTudo(qc),
  })
}
