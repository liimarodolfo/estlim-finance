/**
 * O Supabase nao devolve Error: devolve um objeto com message, code e details.
 * Jogar esse objeto direto no toast imprime "[object Object]". Tudo que sai dos
 * hooks passa por aqui primeiro, para a tela receber sempre um Error de verdade.
 */

type ErroDoSupabase = {
  message?: unknown
  error_description?: unknown
  details?: unknown
  hint?: unknown
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error && erro.message) return erro.message
  if (typeof erro === 'string') return erro

  if (erro && typeof erro === 'object') {
    const e = erro as ErroDoSupabase
    for (const campo of [e.message, e.error_description, e.details, e.hint]) {
      if (typeof campo === 'string' && campo.trim()) return campo
    }
  }

  return 'Algo deu errado. Tente de novo.'
}

/** Converte qualquer erro do Supabase num Error com a mensagem legivel. */
export function comoErro(erro: unknown): Error {
  return erro instanceof Error ? erro : new Error(mensagemDeErro(erro))
}
