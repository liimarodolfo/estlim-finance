import { describe, expect, it } from 'vitest'
import { mascaraData, mascaraHora, mascaraMoeda, mascaraTelefone } from './masks'

// As máscaras são o que garante o item 6 da lista de testes mínimos na hora da
// digitação: data em DD/MM/AAAA e hora em 24h, sem o seletor do sistema.

describe('máscara de data', () => {
  it('formata enquanto se digita', () => {
    expect(mascaraData('2')).toBe('2')
    expect(mascaraData('22')).toBe('22')
    expect(mascaraData('2208')).toBe('22/08')
    expect(mascaraData('22081990')).toBe('22/08/1990')
  })

  it('ignora o que não é número e não passa de 8 dígitos', () => {
    expect(mascaraData('22/08/1990')).toBe('22/08/1990')
    expect(mascaraData('22a08b1990c')).toBe('22/08/1990')
    expect(mascaraData('220819901234')).toBe('22/08/1990')
  })
})

describe('máscara de hora', () => {
  it('formata em 24h', () => {
    expect(mascaraHora('19')).toBe('19')
    expect(mascaraHora('1945')).toBe('19:45')
    expect(mascaraHora('0005')).toBe('00:05')
    expect(mascaraHora('235959')).toBe('23:59')
  })
})

describe('máscara de telefone', () => {
  it('formata celular e fixo', () => {
    expect(mascaraTelefone('16999990000')).toBe('(16) 99999-0000')
    expect(mascaraTelefone('1633334444')).toBe('(16) 3333-4444')
  })

  it('formata parcial enquanto se digita', () => {
    expect(mascaraTelefone('1')).toBe('1')
    expect(mascaraTelefone('16')).toBe('16')
    expect(mascaraTelefone('169')).toBe('(16) 9')
  })
})

describe('máscara de moeda', () => {
  it('digita em centavos, da direita para a esquerda', () => {
    expect(mascaraMoeda('1')).toEqual({ texto: '0,01', numero: 0.01 })
    expect(mascaraMoeda('123')).toEqual({ texto: '1,23', numero: 1.23 })
    expect(mascaraMoeda('123456')).toEqual({ texto: '1.234,56', numero: 1234.56 })
  })

  it('campo vazio devolve texto vazio, para virar null no formulário', () => {
    // É por aqui que o lançamento de valor variável consegue existir sem valor.
    expect(mascaraMoeda('')).toEqual({ texto: '', numero: 0 })
    expect(mascaraMoeda('abc')).toEqual({ texto: '', numero: 0 })
  })
})
