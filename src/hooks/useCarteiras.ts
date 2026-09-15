import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/hooks/usePerfil'
import type { Carteira, Dono, TipoAjuste, TipoCarteira } from '@/types/database'
import { comoErro } from '@/lib/erros'

export type NovaCarteira = {
  tipo: TipoCarteira
  nome: string
  dono: Dono
  banco: string | null
  banco_nome: string | null
  descricao: string | null
  cor_gradiente: string | null
  saldo: number
  bandeira: string | null
  funcao: string | null
  limite: number
  usado: number
  dia_fechamento: number | null
  dia_vencimento: number | null
}

/** Carteiras ativas do casal. As arquivadas somem das telas mas ficam no banco. */
export function useCarteiras() {
  return useQuery({
    queryKey: ['carteiras'],
    queryFn: async (): Promise<Carteira[]> => {
      const { data, error } = await supabase
        .from('carteiras')
        .select('*')
        .eq('ativo', true)
        .order('tipo')
        .order('nome')
      if (error) throw comoErro(error)
      return data
    },
  })
}

export function useSalvarCarteira() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string | null; dados: NovaCarteira }) => {
      if (id) {
        const { error } = await supabase.from('carteiras').update(dados).eq('id', id)
        if (error) throw comoErro(error)
        return
      }
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')
      const { error } = await supabase.from('carteiras').insert({ ...dados, casal_id: perfil.casal_id })
      if (error) throw comoErro(error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carteiras'] })
      // Criar cartao gera a fatura automatica no banco, entao a lista muda junto.
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
    },
  })
}

/** Devolve 'excluida' ou 'arquivada', conforme a carteira tenha histórico ou não. */
export function useExcluirCarteira() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { data, error } = await supabase.rpc('fn_excluir_carteira', { p_carteira_id: id })
      if (error) throw comoErro(error)
      return data as unknown as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carteiras'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
    },
  })
}

export function useCriarAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: {
      carteiraId: string
      tipo: TipoAjuste
      valor: number
      motivo: string
    }) => {
      const { error } = await supabase.rpc('fn_criar_ajuste', {
        p_carteira_id: dados.carteiraId,
        p_tipo: dados.tipo,
        p_valor: dados.valor,
        p_motivo: dados.motivo,
      })
      if (error) throw comoErro(error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carteiras'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
    },
  })
}
