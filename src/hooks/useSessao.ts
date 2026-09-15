import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'

type EstadoSessao = {
  sessao: Session | null
  carregando: boolean
}

/** Sessão do Supabase Auth, com o cache limpo a cada troca de usuário. */
export function useSessao(): EstadoSessao {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const qc = useQueryClient()
  const usuarioAnterior = useRef<string | null>(null)

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      usuarioAnterior.current = data.session?.user.id ?? null
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
      setCarregando(false)

      // Nenhum dado de um usuario pode sobrar no cache do outro. Mas limpar a
      // cada SIGNED_IN era demais: esse evento tambem dispara quando o token se
      // renova ou a aba volta ao foco, e ai o cache inteiro ia embora a toa.
      const usuario = nova?.user.id ?? null
      if (usuario !== usuarioAnterior.current) {
        if (usuarioAnterior.current !== null) qc.clear()
        usuarioAnterior.current = usuario
      }
    })

    return () => {
      vivo = false
      inscricao.subscription.unsubscribe()
    }
  }, [qc])

  return { sessao, carregando }
}

export async function entrar(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw comoErro(error)
}

export async function recuperarSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/perfil`,
  })
  if (error) throw comoErro(error)
}

export async function sair() {
  const { error } = await supabase.auth.signOut()
  if (error) throw comoErro(error)
}
