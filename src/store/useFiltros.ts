import { create } from 'zustand'

export type Dono = 'Geral' | 'Rodolfo' | 'Thainy' | 'Casal' | 'RLiima'
/** Os chips da lista de lançamentos. Mora no store porque a busca precisa
 *  zerar o filtro ao levar para um lançamento de outro recorte. */
export type FiltroLista =
  | 'todos' | 'receita' | 'despesa' | 'investimento'
  | 'fixa' | 'parcelada' | 'pendente' | 'pago'

const hoje = new Date()

type EstadoFiltros = {
  mes: number
  ano: number
  dono: Dono
  filtro: FiltroLista
  diaSelecionado: number
  /** Lançamento que a busca mandou destacar ao chegar na lista. */
  idEmFoco: string | null
  setMes: (mes: number) => void
  setAno: (ano: number) => void
  setDono: (dono: Dono) => void
  setFiltro: (filtro: FiltroLista) => void
  setDiaSelecionado: (dia: number) => void
  irPara: (mes: number, ano: number, id: string) => void
  limparFoco: () => void
}

export const useFiltros = create<EstadoFiltros>((set) => ({
  mes: hoje.getMonth(),
  ano: hoje.getFullYear(),
  dono: 'Geral',
  filtro: 'todos',
  diaSelecionado: hoje.getDate(),
  idEmFoco: null,
  setMes: (mes) => set({ mes }),
  setAno: (ano) => set({ ano }),
  setDono: (dono) => set({ dono }),
  setFiltro: (filtro) => set({ filtro }),
  setDiaSelecionado: (diaSelecionado) => set({ diaSelecionado }),
  // A busca troca o mês e marca quem destacar, numa tacada só: em dois sets a
  // lista renderizaria uma vez no mês antigo procurando um id que não existe lá.
  irPara: (mes, ano, id) => set({ mes, ano, filtro: 'todos', idEmFoco: id }),
  limparFoco: () => set({ idEmFoco: null }),
}))
