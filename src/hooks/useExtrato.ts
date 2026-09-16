import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import type { LancTipo } from '@/types/database'

export type Movimento = {
  id: string
  data: string
  hora: string | null
  descricao: string
  tipo: LancTipo
  /** Já com sinal: entrada positiva, saída negativa. */
  efeito: number
  valor: number
}

export type Extrato = {
  movimentos: Movimento[]
  entradas: number
  saidas: number
  saldo: number
}

/**
 * O que entrou e o que saiu de uma conta, que é o que justifica o saldo.
 *
 * A fonte é a tabela de pagamentos, e não a de lançamentos, porque é assim que
 * a regra funciona: o dinheiro só sai quando o pagamento é registrado, e só
 * entra quando o recebimento é registrado. Lançamento pendente não move nada,
 * e por isso não aparece aqui.
 *
 * O ajuste de carteira também nasce como pagamento, então ele entra na lista
 * sozinho, com o motivo na descrição.
 */
export function useExtrato(carteiraId: string | null) {
  return useQuery({
    queryKey: ['extrato', carteiraId],
    enabled: carteiraId !== null,
    queryFn: async (): Promise<Extrato> => {
      const { data: baixas, error } = await supabase
        .from('pagamentos')
        .select('id, lancamento_id, data_pagamento, hora_pagamento, valor_pago')
        .eq('forma_ref', carteiraId as string)
      if (error) throw comoErro(error)

      const ids = baixas.map((p) => p.lancamento_id).filter((id): id is string => id !== null)
      if (ids.length === 0) return { movimentos: [], entradas: 0, saidas: 0, saldo: 0 }

      const { data: lancs, error: erroLancs } = await supabase
        .from('lancamentos')
        .select('id, descricao, tipo')
        .in('id', ids)
      if (erroLancs) throw comoErro(erroLancs)

      const porId = new Map(lancs.map((l) => [l.id, l]))

      const movimentos: Movimento[] = []
      for (const p of baixas) {
        const l = p.lancamento_id ? porId.get(p.lancamento_id) : undefined
        if (!l) continue
        const entrada = l.tipo === 'receita'
        movimentos.push({
          id: p.id,
          data: p.data_pagamento,
          hora: p.hora_pagamento,
          descricao: l.descricao,
          tipo: l.tipo,
          valor: p.valor_pago,
          efeito: entrada ? p.valor_pago : -p.valor_pago,
        })
      }

      // Mais recente primeiro, e no mesmo dia a hora desempata: duas baixas do
      // mesmo dia sem isso apareceriam na ordem em que o banco devolveu.
      movimentos.sort((a, b) => {
        if (a.data !== b.data) return b.data.localeCompare(a.data)
        return (b.hora ?? '').localeCompare(a.hora ?? '')
      })

      const entradas = movimentos.filter((m) => m.efeito > 0).reduce((s, m) => s + m.efeito, 0)
      const saidas = movimentos.filter((m) => m.efeito < 0).reduce((s, m) => s - m.efeito, 0)

      return { movimentos, entradas, saidas, saldo: entradas - saidas }
    },
  })
}
