import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/types/database'

const BUCKET = 'avatares'
const LIMITE_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export type PerfilComFoto = Perfil & { fotoAssinada: string | null }

/** O bucket e privado, entao a foto so aparece por URL assinada. */
async function assinarFoto(caminho: string | null): Promise<string | null> {
  if (!caminho) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 60 * 60)
  if (error) return null
  return data.signedUrl
}

export function usePerfil() {
  return useQuery({
    queryKey: ['perfil'],
    queryFn: async (): Promise<PerfilComFoto | null> => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null

      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      return { ...data, fotoAssinada: await assinarFoto(data.foto_url) }
    },
  })
}

export function useSalvarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: { nome: string; telefone: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada. Entre de novo.')

      const { error } = await supabase
        .from('perfis')
        .update({ nome: dados.nome, telefone: dados.telefone || null })
        .eq('id', auth.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfil'] }),
  })
}

export function useEnviarFoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (arquivo: File) => {
      if (!TIPOS.includes(arquivo.type)) throw new Error('Envie uma imagem PNG, JPG, WEBP ou GIF.')
      if (arquivo.size > LIMITE_BYTES) throw new Error('A imagem precisa ter no máximo 2 MB.')

      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada. Entre de novo.')

      // Caminho fixo por usuario: a policy do bucket so libera a propria pasta,
      // e o upsert evita acumular foto antiga a cada troca.
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const caminho = `${auth.user.id}/foto.${extensao}`

      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })
      if (erroUpload) throw erroUpload

      const { error } = await supabase.from('perfis').update({ foto_url: caminho }).eq('id', auth.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfil'] }),
  })
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: async (dados: { email: string; atual: string; nova: string }) => {
      // O Supabase nao confere a senha atual no updateUser, entao a conferencia
      // e feita reautenticando antes de trocar.
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: dados.email,
        password: dados.atual,
      })
      if (erroLogin) throw new Error('A senha atual não confere.')

      const { error } = await supabase.auth.updateUser({ password: dados.nova })
      if (error) throw error
    },
  })
}

export function useTrocarEmail() {
  return useMutation({
    mutationFn: async (novoEmail: string) => {
      const { error } = await supabase.auth.updateUser({ email: novoEmail.trim() })
      if (error) throw error
    },
  })
}
