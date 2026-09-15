import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/hooks/usePerfil'
import type { Corretora, Dono, Investimento, SubInvestimento, TipoInstituicao } from '@/types/database'
import { comoErro } from '@/lib/erros'

const BUCKET = 'corretoras'
const LIMITE_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export type NovoInvestimento = {
  sub: SubInvestimento
  nome: string
  descricao: string | null
  valor: number
  rentabilidade: string | null
  instituicao_tipo: TipoInstituicao
  carteira_id: string | null
  corretora_id: string | null
  dono: Dono
}

export type CorretoraComLogo = Corretora & { logoAssinado: string | null }

export function useInvestimentos() {
  return useQuery({
    queryKey: ['investimentos'],
    queryFn: async (): Promise<Investimento[]> => {
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .order('sub')
        .order('nome')
      if (error) throw comoErro(error)
      return data
    },
  })
}

/** O bucket é privado, então o logo só aparece por URL assinada. */
export function useCorretoras() {
  return useQuery({
    queryKey: ['corretoras'],
    queryFn: async (): Promise<CorretoraComLogo[]> => {
      const { data, error } = await supabase.from('corretoras').select('*').order('nome')
      if (error) throw comoErro(error)

      return Promise.all(
        data.map(async (c) => {
          if (!c.logo_url) return { ...c, logoAssinado: null }
          const { data: assinada } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(c.logo_url, 60 * 60)
          return { ...c, logoAssinado: assinada?.signedUrl ?? null }
        }),
      )
    },
  })
}

export function useSalvarInvestimento() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string | null; dados: NovoInvestimento }) => {
      if (id) {
        const { error } = await supabase.from('investimentos').update(dados).eq('id', id)
        if (error) throw comoErro(error)
        return
      }
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')
      const { error } = await supabase
        .from('investimentos')
        .insert({ ...dados, casal_id: perfil.casal_id })
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investimentos'] }),
  })
}

/** Devolve quantos aportes históricos ficaram sem destino. */
export function useExcluirInvestimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<number> => {
      const { data, error } = await supabase.rpc('fn_excluir_investimento', {
        p_investimento_id: id,
      })
      if (error) throw comoErro(error)
      return (data as unknown as number) ?? 0
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investimentos'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
    },
  })
}

const CORES_CORRETORA = ['#0b0b0b', '#e8112d', '#6d4aff', '#0e7490', '#f59e0b', '#12855a']

export function useSalvarCorretora() {
  const qc = useQueryClient()
  const { data: perfil } = usePerfil()

  return useMutation({
    mutationFn: async ({
      id,
      nome,
      logo,
      quantasJaExistem,
    }: {
      id: string | null
      nome: string
      logo: File | null
      quantasJaExistem: number
    }) => {
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')

      let caminhoLogo: string | undefined
      if (logo) {
        if (!TIPOS.includes(logo.type)) throw new Error('Envie uma imagem PNG, JPG, WEBP ou SVG.')
        if (logo.size > LIMITE_BYTES) throw new Error('O logo precisa ter no máximo 2 MB.')

        // A primeira pasta do caminho e o casal, que e o que a policy do bucket confere.
        const extensao = logo.name.split('.').pop()?.toLowerCase() ?? 'png'
        const nomeArquivo = id ?? crypto.randomUUID()
        caminhoLogo = `${perfil.casal_id}/${nomeArquivo}.${extensao}`

        const { error: erroUpload } = await supabase.storage
          .from(BUCKET)
          .upload(caminhoLogo, logo, { upsert: true, contentType: logo.type })
        if (erroUpload) throw comoErro(erroUpload)
      }

      if (id) {
        const { error } = await supabase
          .from('corretoras')
          .update({ nome, ...(caminhoLogo ? { logo_url: caminhoLogo } : {}) })
          .eq('id', id)
        if (error) throw comoErro(error)
        return
      }

      const { error } = await supabase.from('corretoras').insert({
        casal_id: perfil.casal_id,
        nome,
        logo_url: caminhoLogo ?? null,
        cor: CORES_CORRETORA[quantasJaExistem % CORES_CORRETORA.length],
      })
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corretoras'] }),
  })
}

export function useExcluirCorretora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('fn_excluir_corretora', { p_corretora_id: id })
      if (error) throw comoErro(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corretoras'] }),
  })
}
