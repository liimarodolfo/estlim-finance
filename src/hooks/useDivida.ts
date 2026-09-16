import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import type { Dono } from '@/types/database'

export type Divida = {
  /** Quanto cada perfil ainda tem a pagar, somando todos os meses. */
  porDono: Record<string, number>
  total: number
  quantas: number
}

/**
 * A dívida de cada carteira: tudo o que está vinculado a ela e ainda não foi
 * pago, não só a fatura do cartão.
 *
 * O valor somado é o de caixa, que é o que vai sair da conta. Na fatura isso
 * importa: ela é cobrada cheia, enquanto o `valor_exibido` dela vem líquido do
 * que já foi lançado em detalhe. E as compras no crédito não entram na conta
 * porque nascem pagas, então somar tudo não conta a mesma dívida duas vezes.
 *
 * Não há recorte de mês de propósito: dívida atrasada de junho continua sendo
 * dívida em setembro.
 */
export function useDivida() {
  return useQuery({
    queryKey: ['divida-por-dono'],
    queryFn: async (): Promise<Divida> => {
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('dono, valor_caixa')
        .eq('tipo', 'despesa')
        .neq('status', 'pago')
      if (error) throw comoErro(error)

      const porDono: Record<string, number> = {}
      let total = 0

      for (const l of data) {
        const valor = l.valor_caixa ?? 0
        if (valor === 0) continue
        const dono = (l.dono ?? 'Rodolfo') as Dono
        porDono[dono] = (porDono[dono] ?? 0) + valor
        total += valor
      }

      return { porDono, total, quantas: data.length }
    },
  })
}
