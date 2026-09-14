// Mascaras de digitacao. Campos de data e hora usam sempre estas funcoes com
// inputMode numerico, nunca type="date" ou type="time", que exibem no formato do sistema.

/** 22081990 vira 22/08/1990 */
export const mascaraData = (valor: string): string => {
  const v = valor.replace(/\D/g, '').slice(0, 8)
  if (v.length > 4) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`
  if (v.length > 2) return `${v.slice(0, 2)}/${v.slice(2)}`
  return v
}

/** 1945 vira 19:45 */
export const mascaraHora = (valor: string): string => {
  const v = valor.replace(/\D/g, '').slice(0, 4)
  if (v.length > 2) return `${v.slice(0, 2)}:${v.slice(2)}`
  return v
}

/** 16999990000 vira (16) 99999-0000 */
export const mascaraTelefone = (valor: string): string => {
  const v = valor.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 2) return v
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

/** Digitacao de moeda em centavos: 1234 vira 12,34. Devolve o numero e o texto. */
export const mascaraMoeda = (valor: string): { texto: string; numero: number } => {
  const digitos = valor.replace(/\D/g, '').slice(0, 12)
  const numero = Number(digitos) / 100
  const texto = digitos
    ? numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : ''
  return { texto, numero }
}
