import { describe, expect, it } from 'vitest'
import { fontesPara, metodosPara, rotuloDaForma, rotuloDaFonte } from './formas'
import type { Carteira } from '@/types/database'

const carteira = (dados: Partial<Carteira>): Carteira =>
  ({
    id: 'x',
    casal_id: 'c',
    dono: 'Rodolfo',
    tipo: 'conta',
    nome: 'Conta',
    banco: null,
    banco_nome: null,
    bandeira: null,
    funcao: null,
    cor_gradiente: null,
    descricao: null,
    saldo: 0,
    limite: 0,
    usado: 0,
    dia_fechamento: null,
    dia_vencimento: null,
    ativo: true,
    criado_em: '2026-09-01',
    ...dados,
  }) as Carteira

const CARTEIRAS = [
  carteira({ id: 'conta-1', nome: 'Nubank', tipo: 'conta', dono: 'Rodolfo' }),
  carteira({ id: 'conta-2', nome: 'Inter', tipo: 'conta', dono: 'Thainy' }),
  carteira({ id: 'cartao-1', nome: 'Itaú', tipo: 'cartao', dono: 'Rodolfo' }),
]

describe('métodos por tipo de lançamento', () => {
  it('despesa aceita crédito', () => {
    expect(metodosPara('despesa').map(([m]) => m)).toContain('credito')
  })

  it('receita não aceita crédito nem débito', () => {
    const metodos = metodosPara('receita').map(([m]) => m)
    expect(metodos).not.toContain('credito')
    expect(metodos).not.toContain('debito')
    expect(metodos).toContain('transferencia')
  })

  it('aporte nunca sai no crédito', () => {
    // Regra de negócio: investir parcelado na fatura não existe. O banco também
    // recusa, pelo chk_aporte_sem_credito.
    expect(metodosPara('investimento').map(([m]) => m)).not.toContain('credito')
  })
})

describe('fontes por método', () => {
  it('crédito lista só cartões', () => {
    expect(fontesPara('credito', CARTEIRAS)).toEqual([['cartao-1', 'Itaú · Rodolfo']])
  })

  it('pix, débito e transferência listam só contas', () => {
    for (const metodo of ['pix', 'debito', 'transferencia'] as const) {
      const fontes = fontesPara(metodo, CARTEIRAS)
      expect(fontes).toHaveLength(2)
      expect(fontes.map(([id]) => id)).toEqual(['conta-1', 'conta-2'])
    }
  })

  it('dinheiro lista as carteiras físicas das pessoas', () => {
    expect(fontesPara('dinheiro', CARTEIRAS)).toEqual([
      ['Rodolfo', 'Carteira Rodolfo'],
      ['Thainy', 'Carteira Thainy'],
    ])
  })
})

describe('rótulo da fonte', () => {
  it('muda conforme o método, como no protótipo', () => {
    expect(rotuloDaFonte('pix')).toBe('Conta do Pix')
    expect(rotuloDaFonte('credito')).toBe('Qual cartão de crédito')
    expect(rotuloDaFonte('dinheiro')).toBe('Qual carteira')
  })
})

describe('rótulo da forma na lista', () => {
  it('mostra método e fonte, nessa ordem', () => {
    expect(rotuloDaForma('credito', 'cartao-1', CARTEIRAS)).toBe('Crédito · Itaú')
    expect(rotuloDaForma('pix', 'conta-2', CARTEIRAS)).toBe('Pix · Inter')
  })

  it('dinheiro mostra a carteira da pessoa', () => {
    expect(rotuloDaForma('dinheiro', 'Thainy', CARTEIRAS)).toBe('Dinheiro · Carteira Thainy')
  })

  it('não quebra quando a conta foi removida da carteira', () => {
    expect(rotuloDaForma('pix', 'sumiu', CARTEIRAS)).toBe('Pix · conta removida')
    expect(rotuloDaForma(null, null, CARTEIRAS)).toBe('Sem forma definida')
  })
})
