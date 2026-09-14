import { create } from 'zustand'

export type Dono = 'Geral' | 'Rodolfo' | 'Thainy' | 'Casal' | 'RLiima'
export type FiltroLista =
  | 'todos' | 'receitas' | 'despesas' | 'fixas' | 'parcelas' | 'pendentes' | 'concluidos'

const hoje = new Date()

type EstadoFiltros = {
  mes: number
  ano: number
  dono: Dono
  filtro: FiltroLista
  diaSelecionado: number
  setMes: (mes: number) => void
  setAno: (ano: number) => void
  setDono: (dono: Dono) => void
  setFiltro: (filtro: FiltroLista) => void
  setDiaSelecionado: (dia: number) => void
}

export const useFiltros = create<EstadoFiltros>((set) => ({
  mes: hoje.getMonth(),
  ano: hoje.getFullYear(),
  dono: 'Geral',
  filtro: 'todos',
  diaSelecionado: hoje.getDate(),
  setMes: (mes) => set({ mes }),
  setAno: (ano) => set({ ano }),
  setDono: (dono) => set({ dono }),
  setFiltro: (filtro) => set({ filtro }),
  setDiaSelecionado: (diaSelecionado) => set({ diaSelecionado }),
}))
