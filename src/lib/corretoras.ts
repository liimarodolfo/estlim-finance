/** Até três iniciais, usadas quando a corretora não tem logo. */
export const iniciaisCorretora = (nome: string): string =>
  nome
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()
