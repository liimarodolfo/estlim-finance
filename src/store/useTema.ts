import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'light' | 'dark'

const FUNDO: Record<Tema, string> = { light: '#ffffff', dark: '#0b0d0f' }

/** Pinta html, body e a meta theme-color. O light nunca herda o fundo do navegador. */
export function aplicarTema(tema: Tema) {
  const html = document.documentElement
  html.dataset.theme = tema
  html.style.setProperty('background-color', FUNDO[tema], 'important')
  html.style.setProperty('color-scheme', tema, 'important')
  document.body.style.setProperty('background-color', FUNDO[tema], 'important')
  document.querySelector('#metaTheme')?.setAttribute('content', FUNDO[tema])
}

type EstadoTema = {
  tema: Tema
  alternar: () => void
  definir: (tema: Tema) => void
}

// Unico uso permitido de localStorage: preferencia local, nunca dado de negocio.
export const useTema = create<EstadoTema>()(
  persist(
    (set, get) => ({
      tema: 'light',
      alternar: () => {
        const novo: Tema = get().tema === 'light' ? 'dark' : 'light'
        aplicarTema(novo)
        set({ tema: novo })
      },
      definir: (tema) => {
        aplicarTema(tema)
        set({ tema })
      },
    }),
    {
      name: 'estlim.tema',
      storage: {
        getItem: (nome) => {
          const valor = localStorage.getItem(nome)
          return valor ? { state: { tema: valor as Tema } } : null
        },
        setItem: (nome, valor) => localStorage.setItem(nome, valor.state.tema),
        removeItem: (nome) => localStorage.removeItem(nome),
      },
    },
  ),
)
