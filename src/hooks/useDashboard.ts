import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { usePerfil } from '@/hooks/usePerfil'
import type { Balanco } from '@/types/database'

export type MesDoHistorico = {
  rotulo: string
  receitas: number
  despesas: number
}

const doisDigitos = (v: number) => String(v).padStart(2, '0')
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Receitas e despesas dos 6 meses que terminam no mês exibido. */
export function useHistorico(mes: number, ano: number) {
  return useQuery({
    queryKey: ['dashboard', 'historico', mes, ano],
    queryFn: async (): Promise<MesDoHistorico[]> => {
      const inicioJanela = new Date(ano, mes - 5, 1)
      const fimJanela = new Date(ano, mes + 1, 0)
      const inicio = `${inicioJanela.getFullYear()}-${doisDigitos(inicioJanela.getMonth() + 1)}-01`
      const fim = `${fimJanela.getFullYear()}-${doisDigitos(fimJanela.getMonth() + 1)}-${doisDigitos(fimJanela.getDate())}`

      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('tipo, valor_exibido, data_vencimento')
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
      if (error) throw comoErro(error)

      const meses: MesDoHistorico[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - i, 1)
        meses.push({ rotulo: MESES_CURTOS[d.getMonth()], receitas: 0, despesas: 0 })
      }

      for (const l of data) {
        if (!l.data_vencimento) continue
        const [a, m] = l.data_vencimento.split('-').map(Number)
        const distancia = (ano - a) * 12 + (mes - (m - 1))
        const indice = 5 - distancia
        if (indice < 0 || indice > 5) continue
        const valor = l.valor_exibido ?? 0
        if (l.tipo === 'receita') meses[indice].receitas += valor
        else if (l.tipo === 'despesa') meses[indice].despesas += valor
      }

      return meses
    },
  })
}

export function useBalanco(mes: number, ano: number) {
  return useQuery({
    queryKey: ['balanco', mes, ano],
    queryFn: async (): Promise<Balanco | null> => {
      const { data, error } = await supabase
        .from('balancos')
        .select('*')
        .eq('mes', mes + 1)
        .eq('ano', ano)
        .maybeSingle()
      if (error) throw comoErro(error)
      return data
    },
  })
}

export type ResumoDoBalanco = {
  receitasPrevistas: number
  receitasRealizadas: number
  despesasPrevistas: number
  despesasRealizadas: number
}

/** Aprova o balanço do mês e guarda quem aprovou e quando. */
export function useAprovarBalanco() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async ({
      mes,
      ano,
      resumo,
    }: {
      mes: number
      ano: number
      resumo: ResumoDoBalanco
    }) => {
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')
      const { error } = await supabase.from('balancos').upsert(
        {
          casal_id: perfil.casal_id,
          mes: mes + 1,
          ano,
          receitas_previstas: resumo.receitasPrevistas,
          receitas_realizadas: resumo.receitasRealizadas,
          despesas_previstas: resumo.despesasPrevistas,
          despesas_realizadas: resumo.despesasRealizadas,
          aprovado: true,
          aprovado_por: perfil.id,
          aprovado_em: new Date().toISOString(),
        },
        { onConflict: 'casal_id,mes,ano' },
      )
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['balanco'] }),
  })
}
