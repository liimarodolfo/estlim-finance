import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/hooks/usePerfil'
import { intervaloDoMes } from '@/lib/formatters'
import type { Categoria, CategoriaTipo } from '@/types/database'
import { comoErro } from '@/lib/erros'

export type NovaCategoria = {
  nome: string
  icone: string
  cor: string
  tipo: CategoriaTipo
  orcamento_mensal: number
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from('categorias').select('*').order('nome')
      if (error) throw comoErro(error)
      return data
    },
  })
}

/**
 * Quanto cada categoria consumiu no mês. Usa valor_exibido da view, então a
 * fatura do cartão já entra pelo limite utilizado, sem a tela recalcular nada.
 */
export function useGastosPorCategoria(mes: number, ano: number) {
  return useQuery({
    queryKey: ['gastos-por-categoria', mes, ano],
    queryFn: async (): Promise<Record<string, number>> => {
      const { inicio, fim } = intervaloDoMes(mes, ano)
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('categoria_id, valor_exibido')
        .eq('tipo', 'despesa')
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
      if (error) throw comoErro(error)

      const total: Record<string, number> = {}
      for (const linha of data) {
        if (!linha.categoria_id) continue
        total[linha.categoria_id] = (total[linha.categoria_id] ?? 0) + (linha.valor_exibido ?? 0)
      }
      return total
    },
  })
}

export function useSalvarCategoria() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string | null; dados: NovaCategoria }) => {
      if (id) {
        const { error } = await supabase.from('categorias').update(dados).eq('id', id)
        if (error) throw comoErro(error)
        return
      }
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')
      const { error } = await supabase.from('categorias').insert({ ...dados, casal_id: perfil.casal_id })
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

/** Devolve quantos lançamentos foram remanejados para Contas fixas. */
export function useExcluirCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<number> => {
      const { data, error } = await supabase.rpc('fn_excluir_categoria', { p_categoria_id: id })
      if (error) throw comoErro(error)
      return (data as unknown as number) ?? 0
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      qc.invalidateQueries({ queryKey: ['gastos-por-categoria'] })
    },
  })
}
