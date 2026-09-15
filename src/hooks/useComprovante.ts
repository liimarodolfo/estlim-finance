import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'

const BUCKET = 'comprovantes'
const LIMITE_BYTES = 5 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

/**
 * O comprovante fica num bucket privado, numa pasta por casal. O que a tabela
 * guarda e o caminho, nunca uma URL: link assinado vence, caminho nao.
 */
export function useEnviarComprovante() {
  return useMutation({
    mutationFn: async (arquivo: File): Promise<string> => {
      if (!TIPOS.includes(arquivo.type)) {
        throw new Error('Envie uma imagem PNG, JPG, WEBP ou um PDF.')
      }
      if (arquivo.size > LIMITE_BYTES) {
        throw new Error('O comprovante precisa ter no máximo 5 MB.')
      }

      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sessão expirada. Entre de novo.')

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('casal_id')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (erroPerfil) throw comoErro(erroPerfil)
      if (!perfil) throw new Error('Perfil ainda carregando. Tente de novo em um instante.')

      // Nome aleatorio: dois comprovantes com o mesmo nome de arquivo nao se
      // atropelam, e o nome original do celular nao vaza para o caminho.
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const caminho = `${perfil.casal_id}/${crypto.randomUUID()}.${extensao}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: arquivo.type })
      if (error) throw comoErro(error)

      return caminho
    },
  })
}

/** Abre o comprovante numa aba nova, por link assinado de uma hora. */
export async function abrirComprovante(caminho: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 60 * 60)
  if (error || !data) throw comoErro(error ?? new Error('Não foi possível abrir o comprovante.'))
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

/** Tira o arquivo do bucket. Usado quando o anexo é trocado ou removido. */
export async function apagarComprovante(caminho: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([caminho])
}
