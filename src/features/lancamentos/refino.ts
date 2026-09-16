import type { LancamentoComBaixa } from '@/hooks/useLancamentos'

export type Ordem = 'data-asc' | 'data-desc' | 'valor-desc' | 'valor-asc'

export type Refino = {
  busca: string
  categoria: string
  recebeuDe: string
  pagouPara: string
  ordem: Ordem
}

/** Ordem padrão é a da própria consulta: nada muda até alguém pedir. */
export const refinoVazio: Refino = {
  busca: '',
  categoria: '',
  recebeuDe: '',
  pagouPara: '',
  ordem: 'data-asc',
}

/**
 * Os dois primeiros itens do pedido diziam só "crescente" e "decrescente". Aqui
 * eles viram valor, escrito por extenso, porque ao lado de duas opções de data
 * "crescente" sozinho não diz de quê.
 */
export const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: 'data-asc', rotulo: 'Data: da mais antiga para a mais próxima' },
  { id: 'data-desc', rotulo: 'Data: da mais próxima para a mais antiga' },
  { id: 'valor-desc', rotulo: 'Valor: do maior para o menor' },
  { id: 'valor-asc', rotulo: 'Valor: do menor para o maior' },
]

export function contarAtivos(r: Refino) {
  return (
    (r.busca.trim() ? 1 : 0) +
    (r.categoria ? 1 : 0) +
    (r.recebeuDe ? 1 : 0) +
    (r.pagouPara ? 1 : 0) +
    (r.ordem !== refinoVazio.ordem ? 1 : 0)
  )
}

/** Sem acento e em minúsculas, para "agua" achar "Água". */
const chato = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** O mesmo número que a linha mostra, para ordenar pelo que se está vendo. */
export function valorDaLinha(l: LancamentoComBaixa) {
  return l.cartao_id ? (l.valor_caixa ?? 0) : (l.valor_realizado ?? l.valor_exibido ?? 0)
}

export function aplicarRefino(lista: LancamentoComBaixa[], r: Refino) {
  let saida = lista

  const termo = chato(r.busca.trim())
  if (termo) {
    saida = saida.filter(
      (l) =>
        chato(l.descricao ?? '').includes(termo) || chato(l.pagar_a ?? '').includes(termo),
    )
  }

  if (r.categoria) saida = saida.filter((l) => l.categoria_id === r.categoria)

  // Os dois seletores de nome se somam em vez de se cruzarem. Cruzados, marcar
  // um de cada lado não devolveria nada: nenhum lançamento é receita e despesa
  // ao mesmo tempo.
  if (r.recebeuDe || r.pagouPara) {
    saida = saida.filter(
      (l) =>
        (r.recebeuDe !== '' && l.tipo === 'receita' && l.pagar_a === r.recebeuDe) ||
        (r.pagouPara !== '' && l.tipo === 'despesa' && l.pagar_a === r.pagouPara),
    )
  }

  if (r.ordem === refinoVazio.ordem) return saida

  const ordenada = [...saida]
  ordenada.sort((a, b) => {
    if (r.ordem === 'valor-desc') return valorDaLinha(b) - valorDaLinha(a)
    if (r.ordem === 'valor-asc') return valorDaLinha(a) - valorDaLinha(b)
    const da = a.data_vencimento ?? ''
    const db = b.data_vencimento ?? ''
    return r.ordem === 'data-desc' ? db.localeCompare(da) : da.localeCompare(db)
  })
  return ordenada
}
