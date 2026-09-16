import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { comoErro } from '@/lib/erros'
import { MESES } from '@/lib/formatters'
import type { Dono } from '@/types/database'

export type Modo = 'mes' | 'ano'

export type Periodo = { modo: Modo; mes: number; ano: number }

export type LinhaDoFluxo = {
  rotulo: string
  receitas: number
  despesas: number
  sobra: number
}

export type LinhaDeCategoria = {
  id: string
  total: number
  fatia: number
  /** Um valor por mês do ano. No modo mês vem com um único item. */
  porMes: number[]
}

export type LinhaDePerfil = {
  dono: Dono
  receitas: number
  despesas: number
  aportes: number
  saldo: number
}

export type LinhaDeNome = { nome: string; total: number; quantas: number }

export type Relatorios = {
  fluxo: LinhaDoFluxo[]
  receitas: number
  despesas: number
  aportes: number
  sobra: number
  categorias: LinhaDeCategoria[]
  perfis: LinhaDePerfil[]
  pagouPara: LinhaDeNome[]
  recebeuDe: LinhaDeNome[]
  quantidade: number
}

const dois = (v: number) => String(v).padStart(2, '0')

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
 * O valor usado é o mesmo que as listas mostram: o realizado quando existe, o
 * previsto enquanto não existe. É de propósito que a fatura do cartão entre
 * junto sem tratamento especial: o `valor_exibido` dela já vem líquido da
 * view, descontado do que foi lançado em detalhe, então somar tudo não conta a
 * mesma compra duas vezes.
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
        receitas: 0,
        despesas: 0,
        sobra: 0,
      }))

      const porCategoria = new Map<string, number[]>()
      const porPerfil = new Map<Dono, LinhaDePerfil>()
      const pagos = new Map<string, LinhaDeNome>()
      const recebidos = new Map<string, LinhaDeNome>()

      let receitas = 0
      let despesas = 0
      let aportes = 0

      for (const l of data) {
        if (!l.data_vencimento || !l.tipo) continue
        const valor = l.valor_realizado ?? l.valor_exibido ?? 0
        if (valor === 0) continue
        const i = indiceDoMes(l.data_vencimento)

        if (l.tipo === 'receita') {
          receitas += valor
          fluxo[i].receitas += valor
        } else if (l.tipo === 'despesa') {
          despesas += valor
          fluxo[i].despesas += valor
        } else {
          aportes += valor
        }

        // O aporte fica fora do gasto por categoria: ele não é consumo, é
        // dinheiro que mudou de lugar e continua sendo do casal.
        if (l.tipo === 'despesa' && l.categoria_id) {
          const serie = porCategoria.get(l.categoria_id) ?? Array<number>(meses).fill(0)
          serie[i] += valor
          porCategoria.set(l.categoria_id, serie)
        }

        if (l.dono) {
          const p = porPerfil.get(l.dono) ?? {
            dono: l.dono,
            receitas: 0,
            despesas: 0,
            aportes: 0,
            saldo: 0,
          }
          if (l.tipo === 'receita') p.receitas += valor
          else if (l.tipo === 'despesa') p.despesas += valor
          else p.aportes += valor
          p.saldo = p.receitas - p.despesas
          porPerfil.set(l.dono, p)
        }

        const nome = (l.pagar_a ?? '').trim()
        if (nome) {
          const alvo = l.tipo === 'receita' ? recebidos : pagos
          if (l.tipo !== 'investimento') {
            const atual = alvo.get(nome) ?? { nome, total: 0, quantas: 0 }
            atual.total += valor
            atual.quantas += 1
            alvo.set(nome, atual)
          }
        }
      }

      for (const linha of fluxo) linha.sobra = linha.receitas - linha.despesas

      const categorias: LinhaDeCategoria[] = [...porCategoria.entries()]
        .map(([id, porMes]) => {
          const total = porMes.reduce((s, v) => s + v, 0)
          return { id, porMes, total, fatia: despesas > 0 ? total / despesas : 0 }
        })
        .sort((a, b) => b.total - a.total)

      const maior = (a: LinhaDeNome, b: LinhaDeNome) => b.total - a.total

      return {
        fluxo,
        receitas,
        despesas,
        aportes,
        sobra: receitas - despesas,
        categorias,
        perfis: [...porPerfil.values()].sort((a, b) => b.despesas - a.despesas),
        pagouPara: [...pagos.values()].sort(maior),
        recebeuDe: [...recebidos.values()].sort(maior),
        quantidade: data.length,
      }
    },
  })
}
