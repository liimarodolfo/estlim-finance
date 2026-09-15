import type { Carteira, LancTipo, MetodoPagamento } from '@/types/database'

// Forma de pagamento em dois niveis: o metodo, e a fonte de onde o dinheiro sai
// ou para onde entra. O rotulo da fonte muda conforme o metodo.

export const METODO_NOME: Record<MetodoPagamento, string> = {
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
}

export const METODO_ICONE: Record<MetodoPagamento, string> = {
  pix: 'fa-bolt',
  credito: 'fa-credit-card',
  debito: 'fa-money-check-dollar',
  dinheiro: 'fa-money-bill-wave',
  transferencia: 'fa-right-left',
}

const ROTULO_FONTE: Record<MetodoPagamento, string> = {
  pix: 'Conta do Pix',
  credito: 'Qual cartão de crédito',
  debito: 'Conta do débito',
  dinheiro: 'Qual carteira',
  transferencia: 'Conta',
}

const METODOS_DESPESA: [MetodoPagamento, string][] = [
  ['pix', 'Pix'],
  ['credito', 'Cartão de Crédito'],
  ['debito', 'Cartão de Débito'],
  ['dinheiro', 'Dinheiro'],
]
const METODOS_RECEITA: [MetodoPagamento, string][] = [
  ['pix', 'Pix'],
  ['transferencia', 'Transferência'],
  ['dinheiro', 'Dinheiro'],
]
// Aporte nunca sai no credito: nao existe investir parcelado na fatura.
const METODOS_APORTE: [MetodoPagamento, string][] = [
  ['pix', 'Pix'],
  ['transferencia', 'Transferência'],
  ['debito', 'Cartão de Débito'],
  ['dinheiro', 'Dinheiro'],
]

export function metodosPara(tipo: LancTipo): [MetodoPagamento, string][] {
  if (tipo === 'receita') return METODOS_RECEITA
  if (tipo === 'investimento') return METODOS_APORTE
  return METODOS_DESPESA
}

export const rotuloDaFonte = (metodo: MetodoPagamento) => ROTULO_FONTE[metodo]

/** As carteiras fisicas de dinheiro nao sao registro: sao as pessoas. */
export const CARTEIRAS_FISICAS: [string, string][] = [
  ['Rodolfo', 'Carteira Rodolfo'],
  ['Thainy', 'Carteira Thainy'],
]

export function fontesPara(metodo: MetodoPagamento, carteiras: Carteira[]): [string, string][] {
  if (metodo === 'dinheiro') return CARTEIRAS_FISICAS
  const tipo = metodo === 'credito' ? 'cartao' : 'conta'
  return carteiras.filter((c) => c.tipo === tipo).map((c) => [c.id, `${c.nome} · ${c.dono}`])
}

/** "Crédito · Nubank", que é como a forma aparece na lista. */
export function rotuloDaForma(
  metodo: MetodoPagamento | null,
  ref: string | null,
  carteiras: Carteira[],
): string {
  if (!metodo) return 'Sem forma definida'
  if (!ref) return METODO_NOME[metodo]
  const fonte =
    metodo === 'dinheiro'
      ? `Carteira ${ref}`
      : (carteiras.find((c) => c.id === ref)?.nome ?? 'conta removida')
  return `${METODO_NOME[metodo]} · ${fonte}`
}
