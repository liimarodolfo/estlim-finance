import { afterEach, describe, expect, it, vi } from 'vitest'
import { comoInstalar, ehIOS, ehSafari, jaInstalado } from './instalacao'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_OS =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
const EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'

// Os testes rodam em node, sem navegador. Aqui e montado so o que a funcao usa:
// o userAgent, o maxTouchPoints (que separa iPad de Mac) e o matchMedia que diz
// se o app ja abriu instalado.
function finge(ua: string, toques = 0, standalone = false) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: toques, configurable: true })
  Object.defineProperty(navigator, 'standalone', { value: false, configurable: true })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: standalone }) })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('de quem é o motor', () => {
  it('reconhece o iPhone', () => {
    finge(IPHONE)
    expect(ehIOS()).toBe(true)
  })

  it('reconhece o iPad, que desde o iPadOS 13 se anuncia como Macintosh', () => {
    finge(IPAD_OS, 5)
    expect(ehIOS()).toBe(true)
  })

  it('não confunde um Mac de verdade com iPad: o Mac não tem toque', () => {
    finge(SAFARI_MAC, 0)
    expect(ehIOS()).toBe(false)
    expect(ehSafari()).toBe(true)
  })

  it('não chama de Safari o Chrome nem o Edge, que trazem Safari no UA', () => {
    finge(CHROME_ANDROID)
    expect(ehSafari()).toBe(false)
    finge(EDGE)
    expect(ehSafari()).toBe(false)
  })
})

describe('que caminho de instalação oferecer', () => {
  it('no Chrome, com o convite do navegador, usa o convite', () => {
    finge(CHROME_ANDROID)
    expect(comoInstalar(true)).toBe('automatico')
  })

  it('no iPhone ensina o caminho, porque o Safari nunca dispara o convite', () => {
    finge(IPHONE)
    expect(comoInstalar(false)).toBe('ios')
  })

  it('no Chrome do iPhone o caminho é o mesmo: lá todo navegador usa o WebKit', () => {
    finge(CHROME_IOS)
    expect(comoInstalar(false)).toBe('ios')
  })

  it('no Safari do Mac manda para Adicionar ao Dock', () => {
    finge(SAFARI_MAC, 0)
    expect(comoInstalar(false)).toBe('safari-mac')
  })

  it('já instalado não oferece nada', () => {
    finge(IPHONE, 5, true)
    expect(jaInstalado()).toBe(true)
    expect(comoInstalar(false)).toBe('ja-instalado')
  })

  it('sem convite e fora do Safari, fica quieto em vez de ensinar o caminho errado', () => {
    finge(CHROME_ANDROID)
    expect(comoInstalar(false)).toBe('sem-suporte')
  })
})
