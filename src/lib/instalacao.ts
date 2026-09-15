/**
 * Como o aparelho instala um PWA.
 *
 * O evento `beforeinstallprompt`, que o app usa para oferecer o botao Instalar,
 * so existe no Chromium. A Apple nunca o implementou, entao no Safari ele nunca
 * dispara e o convite simplesmente nao aparece. La a instalacao e manual, e a
 * unica coisa util que o app pode fazer e ensinar o caminho.
 */
export type ComoInstalar = 'automatico' | 'ios' | 'safari-mac' | 'ja-instalado' | 'sem-suporte'

const ua = () => navigator.userAgent

/** O app ja esta rodando instalado, fora do navegador. */
export function jaInstalado(): boolean {
  const comoApp = window.matchMedia('(display-mode: standalone)').matches
  // O iOS nao expoe display-mode: standalone em versoes antigas, so este campo.
  const noIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return comoApp || noIOS
}

export function ehIOS(): boolean {
  const s = ua()
  if (/iphone|ipad|ipod/i.test(s)) return true
  // iPad com iPadOS 13 em diante se anuncia como Macintosh. O que o entrega e a
  // tela sensivel ao toque, que o Mac nao tem.
  return /macintosh/i.test(s) && navigator.maxTouchPoints > 1
}

export function ehSafari(): boolean {
  const s = ua()
  return /safari/i.test(s) && !/chrome|chromium|crios|fxios|edg|opr|android/i.test(s)
}

/**
 * No iOS todo navegador usa o motor do Safari, entao o caminho e o mesmo em
 * qualquer um deles: o menu de compartilhar.
 */
export function comoInstalar(temConviteAutomatico: boolean): ComoInstalar {
  if (jaInstalado()) return 'ja-instalado'
  if (temConviteAutomatico) return 'automatico'
  if (ehIOS()) return 'ios'
  if (ehSafari()) return 'safari-mac'
  return 'sem-suporte'
}
