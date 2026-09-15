import { describe, expect, it } from 'vitest'
import { comoErro, mensagemDeErro } from './erros'

// O Supabase nao devolve Error, devolve objeto. Sem isso o toast imprimia
// "[object Object]", que foi o defeito visto ao excluir corretora com
// investimento vinculado.

describe('mensagem de erro', () => {
  it('lê a mensagem de um Error', () => {
    expect(mensagemDeErro(new Error('deu ruim'))).toBe('deu ruim')
  })

  it('lê a mensagem do objeto que o Supabase devolve', () => {
    expect(mensagemDeErro({ message: 'Há 1 investimento nessa corretora.', code: '23503' })).toBe(
      'Há 1 investimento nessa corretora.',
    )
  })

  it('cai para details e hint quando não há message', () => {
    expect(mensagemDeErro({ details: 'detalhe' })).toBe('detalhe')
    expect(mensagemDeErro({ hint: 'dica' })).toBe('dica')
  })

  it('aceita string crua', () => {
    expect(mensagemDeErro('texto solto')).toBe('texto solto')
  })

  it('nunca devolve [object Object]', () => {
    expect(mensagemDeErro({})).toBe('Algo deu errado. Tente de novo.')
    expect(mensagemDeErro(null)).toBe('Algo deu errado. Tente de novo.')
    expect(mensagemDeErro(undefined)).toBe('Algo deu errado. Tente de novo.')
    expect(mensagemDeErro(42)).toBe('Algo deu errado. Tente de novo.')
  })
})

describe('comoErro', () => {
  it('devolve sempre um Error de verdade', () => {
    expect(comoErro({ message: 'x' })).toBeInstanceOf(Error)
    expect(comoErro({ message: 'x' }).message).toBe('x')
  })

  it('não embrulha um Error que já veio pronto', () => {
    const original = new Error('original')
    expect(comoErro(original)).toBe(original)
  })
})
