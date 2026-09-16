import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { intervaloDoMes } from '@/lib/formatters'
import type { Dono } from '@/types/database'

export type Divida = {
  /** Quanto cada perfil ainda tem a pagar no mês pedido. */
  porDono: Record<string, number>
  total: number
}

/**
 * O que ainda falta pagar no mês, por perfil.
 *
 * O valor somado é o de caixa, que é o que vai sair da conta. Na fatura isso
 * importa: ela é cobrada cheia, enquanto o `valor_exibido` dela vem líquido do
 * que já foi lançado em detalhe. E as compras no crédito não entram na conta
 * porque nascem pagas, então somar tudo não conta a mesma dívida duas vezes.
 */
export function useDivida(mes: number, ano: number) {
  const { inicio, fim } = intervaloDoMes(mes, ano)

  return useQuery({
    queryKey: ['divida-por-dono', mes, ano],
    queryFn: async (): Promise<Divida> => {
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('dono, valor_caixa')
        .eq('tipo', 'despesa')
        .neq('status', 'pago')
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
      if (error) throw comoErro(error)

      const porDono: Record<string, number> = {}
      let total = 0

      for (const l of data) {
        const valor = l.valor_caixa ?? 0
        if (valor === 0) continue
        const dono = (l.dono ?? 'Casal') as Dono
        porDono[dono] = (porDono[dono] ?? 0) + valor
        total += valor
      }

      return { porDono, total }
    },
  })
}
