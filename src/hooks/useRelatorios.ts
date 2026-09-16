import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { MESES } from '@/lib/formatters'
import type { Dono } from '@/types/database'

export type Modo = 'mes' | 'ano'

/** Qual das duas colunas manda nas listas. O padrão é o que de fato aconteceu. */
export type Base = 'real' | 'prev'

export type Periodo = { modo: Modo; mes: number; ano: number }

/**
 * Todo número dos relatórios anda em par.
 *
 * `prev` é o que estava planejado e `real` é o que foi registrado. Misturar os
 * dois num valor só foi o erro da primeira versão desta tela: ela somava o
 * previsto de quem ainda não pagou com o realizado de quem já pagou, e chamava
 * o resultado de "Entrou", no passado. A regra aqui é a mesma do Balanço:
 * previsto é `valor_exibido`, realizado é `valor_realizado`.
 */
export type Par = { prev: number; real: number }

export type LinhaDoFluxo = {
  rotulo: string
  receitas: Par
  despesas: Par
}

export type LinhaDeCategoria = {
  id: string
  total: Par
  /** Um valor por mês do ano, em cada base. No modo mês vem com um item só. */
  porMes: { prev: number[]; real: number[] }
}

export type LinhaDePerfil = {
  dono: Dono
  receitas: Par
  despesas: Par
  aportes: Par
}

export type LinhaDeNome = { nome: string; total: Par; quantas: number }

export type Relatorios = {
  fluxo: LinhaDoFluxo[]
  receitas: Par
  despesas: Par
  aportes: Par
  categorias: LinhaDeCategoria[]
  perfis: LinhaDePerfil[]
  pagouPara: LinhaDeNome[]
  recebeuDe: LinhaDeNome[]
  quantidade: number
}

const dois = (v: number) => String(v).padStart(2, '0')
const zero = (): Par => ({ prev: 0, real: 0 })

export const somaDoPar = (p: Par, base: Base) => (base === 'real' ? p.real : p.prev)

export function intervaloDoPeriodo(p: Periodo) {
  if (p.modo === 'ano') {
    return { inicio: `${p.ano}-01-01`, fim: `${p.ano}-12-31` }
  }
  const ultimo = new Date(p.ano, p.mes + 1, 0).getDate()
  return {
    inicio: `${p.ano}-${dois(p.mes + 1)}-01`,
    fim: `${p.ano}-${dois(p.mes + 1)}-${dois(ultimo)}`,
  }
}

/**
 * Os quatro relatórios saem de uma consulta só.
 *
 * A fatura do cartão entra sem tratamento especial de propósito: o
 * `valor_exibido` dela já vem líquido da view, descontado do que foi lançado em
 * detalhe, então somar tudo não conta a mesma compra duas vezes.
 */
export function useRelatorios(periodo: Periodo) {
  const { inicio, fim } = intervaloDoPeriodo(periodo)

  return useQuery({
    queryKey: ['relatorios', periodo.modo, periodo.modo === 'ano' ? 0 : periodo.mes, periodo.ano],
    queryFn: async (): Promise<Relatorios> => {
      const { data, error } = await supabase
        .from('v_lancamentos')
        .select('tipo, dono, categoria_id, pagar_a, data_vencimento, valor_exibido, valor_realizado')
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
      if (error) throw comoErro(error)

      const meses = periodo.modo === 'ano' ? 12 : 1
      const indiceDoMes = (iso: string) =>
        periodo.modo === 'ano' ? Number(iso.slice(5, 7)) - 1 : 0

      const fluxo: LinhaDoFluxo[] = Array.from({ length: meses }, (_, i) => ({
        rotulo: periodo.modo === 'ano' ? MESES[i] : MESES[periodo.mes],
        receitas: zero(),
        despesas: zero(),
      }))

      const porCategoria = new Map<string, LinhaDeCategoria>()
      const porPerfil = new Map<Dono, LinhaDePerfil>()
      const pagos = new Map<string, LinhaDeNome>()
      const recebidos = new Map<string, LinhaDeNome>()

      const receitas = zero()
      const despesas = zero()
      const aportes = zero()

      for (const l of data) {
        if (!l.data_vencimento || !l.tipo) continue
        const prev = l.valor_exibido ?? 0
        const real = l.valor_realizado ?? 0
        if (prev === 0 && real === 0) continue
        const i = indiceDoMes(l.data_vencimento)

        const somar = (alvo: Par) => {
          alvo.prev += prev
          alvo.real += real
        }

        if (l.tipo === 'receita') {
          somar(receitas)
          somar(fluxo[i].receitas)
        } else if (l.tipo === 'despesa') {
          somar(despesas)
          somar(fluxo[i].despesas)
        } else {
          somar(aportes)
        }

        // O aporte fica fora do gasto por categoria: ele não é consumo, é
        // dinheiro que mudou de lugar e continua sendo do casal.
        if (l.tipo === 'despesa' && l.categoria_id) {
          const c =
            porCategoria.get(l.categoria_id) ??
            {
              id: l.categoria_id,
              total: zero(),
              porMes: {
                prev: Array<number>(meses).fill(0),
                real: Array<number>(meses).fill(0),
              },
            }
          somar(c.total)
          c.porMes.prev[i] += prev
          c.porMes.real[i] += real
          porCategoria.set(l.categoria_id, c)
        }

        if (l.dono) {
          const p =
            porPerfil.get(l.dono) ??
            { dono: l.dono, receitas: zero(), despesas: zero(), aportes: zero() }
          if (l.tipo === 'receita') somar(p.receitas)
          else if (l.tipo === 'despesa') somar(p.despesas)
          else somar(p.aportes)
          porPerfil.set(l.dono, p)
        }

        const nome = (l.pagar_a ?? '').trim()
        if (nome && l.tipo !== 'investimento') {
          const alvo = l.tipo === 'receita' ? recebidos : pagos
          const atual = alvo.get(nome) ?? { nome, total: zero(), quantas: 0 }
          somar(atual.total)
          atual.quantas += 1
          alvo.set(nome, atual)
        }
      }

      // A ordenação padrão é pelo previsto, que existe para todas as linhas. A
      // tela reordena pela base escolhida, porque ordenar pelo realizado aqui
      // jogaria para o fim tudo o que ainda não foi pago.
      const maior = (a: { total: Par }, b: { total: Par }) => b.total.prev - a.total.prev

      return {
        fluxo,
        receitas,
        despesas,
        aportes,
        categorias: [...porCategoria.values()].sort(maior),
        perfis: [...porPerfil.values()].sort((a, b) => b.despesas.prev - a.despesas.prev),
        pagouPara: [...pagos.values()].sort(maior),
        recebeuDe: [...recebidos.values()].sort(maior),
        quantidade: data.length,
      }
    },
  })
}
