import { create } from 'zustand'

type Estado = {
  pedido: number
  pedir: () => void
}

/**
 * O FAB mora no shell e o sheet de novo lançamento mora na tela de Lançamentos.
 * Este contador é o recado entre os dois: cada toque incrementa, e a tela abre
 * o sheet ao ver o número mudar.
 */
export const useNovoLancamento = create<Estado>((set, get) => ({
  pedido: 0,
  pedir: () => set({ pedido: get().pedido + 1 }),
}))
