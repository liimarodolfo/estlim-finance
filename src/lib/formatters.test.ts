import { describe, expect, it } from 'vitest'
import {
  agora,
  fmtData,
  fmtDataLocal,
  fmtHora,
  fmtMoeda,
  iniciais,
  intervaloDoMes,
  paraISO,
} from './formatters'

// Item 6 da lista de testes mínimos: datas em DD/MM/AAAA e horas em 24h.

describe('moeda', () => {
  it('escreve em BRL no padrão brasileiro', () => {
    expect(fmtMoeda(1234.56)).toBe('R$ 1.234,56')
    expect(fmtMoeda(0)).toBe('R$ 0,00')
  })

  it('mostra traço quando não há valor, em vez de zero', () => {
    // Zero e "sem valor" são coisas diferentes: a conta variável sem valor
    // preenchido não pode parecer uma conta de R$ 0,00.
    expect(fmtMoeda(null)).toBe('-')
    expect(fmtMoeda(undefined)).toBe('-')
  })
})

describe('data', () => {
  it('converte a data do banco para DD/MM/AAAA', () => {
    expect(fmtData('2026-09-14')).toBe('14/09/2026')
    expect(fmtData('2026-01-05T23:10:00Z')).toBe('05/01/2026')
  })

  it('converte DD/MM/AAAA de volta para o formato do banco', () => {
    expect(paraISO('14/09/2026')).toBe('2026-09-14')
    expect(paraISO('05/01/2026')).toBe('2026-01-05')
  })

  it('recusa data inexistente em vez de deslizar para o mês seguinte', () => {
    expect(paraISO('31/02/2026')).toBeNull()
    expect(paraISO('30/02/2026')).toBeNull()
    expect(paraISO('31/04/2026')).toBeNull()
  })

  it('recusa data incompleta ou fora de faixa', () => {
    expect(paraISO('14/09/20')).toBeNull()
    expect(paraISO('14/13/2026')).toBeNull()
    expect(paraISO('00/09/2026')).toBeNull()
    expect(paraISO('')).toBeNull()
    expect(paraISO(null)).toBeNull()
  })

  it('aceita ano bissexto', () => {
    expect(paraISO('29/02/2028')).toBe('2028-02-29')
    expect(paraISO('29/02/2027')).toBeNull()
  })

  it('a volta e a ida se fecham', () => {
    expect(fmtData(paraISO('14/09/2026'))).toBe('14/09/2026')
  })
})

describe('hora', () => {
  it('corta os segundos do banco e deixa 24h', () => {
    expect(fmtHora('21:26:50.411687')).toBe('21:26')
    expect(fmtHora('09:05:00')).toBe('09:05')
    expect(fmtHora('23:59:59')).toBe('23:59')
  })
})

describe('agora', () => {
  it('devolve data e hora do momento, nos dois formatos', () => {
    const n = agora()
    expect(n.dataBR).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(n.dataISO).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(n.hora).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
    // As duas datas são o mesmo dia, escritas de jeitos diferentes.
    expect(paraISO(n.dataBR)).toBe(n.dataISO)
  })
})

describe('data local de um timestamp', () => {
  it('usa o fuso de quem olha, não o UTC', () => {
    // 14/09 às 21h no Brasil já é 15/09 em UTC. Cortar o ISO daria o dia errado.
    const timestamp = new Date(2026, 8, 14, 21, 30).toISOString()
    expect(fmtDataLocal(timestamp)).toBe('14/09/2026')
  })

  it('devolve vazio para entrada inválida', () => {
    expect(fmtDataLocal(null)).toBe('')
    expect(fmtDataLocal('nada disso')).toBe('')
  })
})

describe('intervalo do mês', () => {
  it('pega do primeiro ao último dia', () => {
    expect(intervaloDoMes(8, 2026)).toEqual({ inicio: '2026-09-01', fim: '2026-09-30' })
    expect(intervaloDoMes(0, 2026)).toEqual({ inicio: '2026-01-01', fim: '2026-01-31' })
  })

  it('acerta fevereiro nos dois casos', () => {
    expect(intervaloDoMes(1, 2027).fim).toBe('2027-02-28')
    expect(intervaloDoMes(1, 2028).fim).toBe('2028-02-29')
  })
})

describe('iniciais', () => {
  it('pega as duas primeiras letras dos dois primeiros nomes', () => {
    expect(iniciais('Rodolfo Liima')).toBe('RL')
    expect(iniciais('Thainy')).toBe('T')
    expect(iniciais('  rodolfo  esteves liima ')).toBe('RE')
  })

  it('não quebra com nome vazio', () => {
    expect(iniciais('')).toBe('US')
  })
})
