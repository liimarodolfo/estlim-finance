import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type EstadoSessao = {
  sessao: Session | null
  carregando: boolean
}

/** Sessão do Supabase Auth, com o cache limpo a cada troca de usuário. */
export function useSessao(): EstadoSessao {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: inscricao } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova)
      setCarregando(false)
      // Nenhum dado de um usuario pode sobrar no cache do outro.
      if (evento === 'SIGNED_OUT' || evento === 'SIGNED_IN') qc.clear()
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
  if (error) throw error
}

export async function cadastrar(email: string, senha: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
  if (error) throw error
  // Sem sessao na volta significa que o Supabase mandou e-mail de confirmacao.
  return { precisaConfirmarEmail: !data.session }
}

export async function recuperarSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/perfil`,
  })
  if (error) throw error
}

export async function sair() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
