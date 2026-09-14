import { create } from 'zustand'

export type Toast = {
  id: number
  texto: string
  icone: string
  saindo?: boolean
}

// O protótipo mantém o toast 2,6s na tela, o mesmo tempo da barra de progresso.
const DURACAO = 2600
const SAIDA = 320

let proximoId = 1

type EstadoToasts = {
  toasts: Toast[]
  mostrar: (texto: string, icone?: string) => void
  remover: (id: number) => void
}

export const useToasts = create<EstadoToasts>((set, get) => ({
  toasts: [],
  mostrar: (texto, icone = 'fa-check') => {
    const id = proximoId++
    set({ toasts: [...get().toasts, { id, texto, icone }] })
    window.setTimeout(() => {
      set({ toasts: get().toasts.map((t) => (t.id === id ? { ...t, saindo: true } : t)) })
      window.setTimeout(() => get().remover(id), SAIDA)
    }, DURACAO)
  },
  remover: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

/** Atalho para usar fora de componente, em hooks e mutations. */
export const toast = (texto: string, icone?: string) => useToasts.getState().mostrar(texto, icone)
