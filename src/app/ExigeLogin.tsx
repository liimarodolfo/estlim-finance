import type { ReactNode } from 'react'
import { useSessao } from '@/hooks/useSessao'
import Login from '@/features/auth/Login'

/** Nenhuma rota do app existe sem sessão. Sem login, a única tela possível é a de entrar. */
export function ExigeLogin({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useSessao()

  if (carregando) {
    return (
      <div className="carregando-tela" role="status" aria-label="Carregando">
        <i className="fa-solid fa-circle-notch" aria-hidden="true" />
      </div>
    )
  }

  if (!sessao) return <Login />

  return <>{children}</>
}
