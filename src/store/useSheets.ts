import { create } from 'zustand'

type EstadoSheets = {
  abertos: number
  abrir: () => void
  fechar: () => void
}

/**
 * Conta quantos sheets estão abertos. Serve para o FAB virar X enquanto houver
 * sheet na tela e para travar a rolagem do fundo, como no protótipo.
 */
export const useSheets = create<EstadoSheets>((set, get) => ({
  abertos: 0,
  abrir: () => set({ abertos: get().abertos + 1 }),
  fechar: () => set({ abertos: Math.max(0, get().abertos - 1) }),
}))
