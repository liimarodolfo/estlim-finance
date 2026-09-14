// Formatadores unicos do app. Nenhuma tela monta data, hora ou moeda na mao.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const doisDigitos = (v: number) => String(v).padStart(2, '0')

/** R$ 1.234,56 */
export const fmtMoeda = (valor: number | null | undefined): string =>
  valor == null ? '-' : brl.format(valor)

/** R$ 1.235, sem centavos, para os cards de resumo */
export const fmtMoedaCurta = (valor: number | null | undefined): string =>
  valor == null ? '-' : brlCompacto.format(valor)

/** Converte a data ISO do banco (AAAA-MM-DD) para DD/MM/AAAA */
export const fmtData = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return ''
  return `${dia}/${mes}/${ano}`
}

/** Converte DD/MM/AAAA para a data ISO do banco (AAAA-MM-DD). Devolve null se invalida. */
export const paraISO = (dataBR: string | null | undefined): string | null => {
  const m = (dataBR ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  // Rejeita 31/02 e afins
  const d = new Date(ano, mes - 1, dia)
  if (d.getDate() !== dia || d.getMonth() !== mes - 1 || d.getFullYear() !== ano) return null
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`
}

/** Corta os segundos do time do Postgres, deixando HH:MM */
export const fmtHora = (hora: string | null | undefined): string =>
  hora ? hora.slice(0, 5) : ''

/** Data e hora do clique, o insumo do check de baixa. */
export const agora = () => {
  const n = new Date()
  return {
    dataBR: `${doisDigitos(n.getDate())}/${doisDigitos(n.getMonth() + 1)}/${n.getFullYear()}`,
    dataISO: `${n.getFullYear()}-${doisDigitos(n.getMonth() + 1)}-${doisDigitos(n.getDate())}`,
    hora: `${doisDigitos(n.getHours())}:${doisDigitos(n.getMinutes())}`,
  }
}

/** Primeiro e ultimo dia do mes, em ISO, para os filtros por competencia. */
export const intervaloDoMes = (mes: number, ano: number) => ({
  inicio: `${ano}-${doisDigitos(mes + 1)}-01`,
  fim: `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(new Date(ano, mes + 1, 0).getDate())}`,
})

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const
export const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

/** Duas iniciais do nome, usadas no avatar quando nao ha foto. */
export const iniciais = (nome: string): string => {
  const partes = nome.trim().split(/\s+/)
  const letras = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
  return letras || 'US'
}
