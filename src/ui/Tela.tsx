import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  id?: string
}

/** Contêiner de tela. A classe view carrega o padding e a animação de entrada do protótipo. */
export function Tela({ children, id }: Props) {
  return (
    <main className="view active" id={id}>
      {children}
    </main>
  )
}
