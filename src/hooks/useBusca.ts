import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'

/** Abaixo disso a busca devolveria quase tudo, e não ajudaria ninguém. */
const MINIMO = 2

/** Teto de resultados: quem precisa de mais do que isso quer um relatório. */
const TETO = 40

/**
 * Tira do termo o que o PostgREST e o LIKE leem como sintaxe. A vírgula e os
 * parênteses quebram o `or=(...)`, e o % e o _ viram curinga dentro do ilike,
 * fazendo "10%" casar com qualquer coisa.
 */
function limpar(termo: string) {
  return termo.replace(/[,()\\%_"]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Busca por descrição e por a quem se paga, em todos os meses.
 *
 * O escopo é o ano inteiro de propósito: limitada ao mês visível, ela repetiria
 * a lista que já está na tela. Quem busca está procurando o que não está vendo.
 */
export function useBuscaLancamentos(termo: string) {
  const limpo = limpar(termo)

  return useQuery({
    queryKey: ['busca-lancamentos', limpo],
    enabled: limpo.length >= MINIMO,
    queryFn: async (): Promise<LancamentoComBaixa[]> => {
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('*')
        .or(`descricao.ilike.%${limpo}%,pagar_a.ilike.%${limpo}%`)
        .order('data_vencimento', { ascending: false })
        .limit(TETO)
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

export const buscaMinima = MINIMO
export const buscaTeto = TETO
export const limparTermo = limpar
