// Marcas, gradientes e bandeiras, copiados do protótipo v40.

export type Marca = {
  bg: string
  fg?: string
  label: string
  icone?: string
}

export const MARCAS: Record<string, Marca> = {
  nubank: { bg: '#820ad1', label: 'nu' },
  itau: { bg: '#ec7000', label: 'itaú' },
  bradesco: { bg: '#cc092f', label: 'bra' },
  bb: { bg: '#f9dd16', fg: '#003399', label: 'BB' },
  caixa: { bg: '#0070af', label: 'CX' },
  santander: { bg: '#ec0000', label: 'san' },
  inter: { bg: '#ff7a00', label: 'in' },
  c6: { bg: '#1a1a1a', label: 'C6' },
  btg: { bg: '#0d1b2a', label: 'BTG' },
  sicoob: { bg: '#006341', label: 'SIC' },
  sicredi: { bg: '#64a70b', label: 'SIC' },
  safra: { bg: '#12284b', label: 'SFR' },
  picpay: { bg: '#21c25e', label: 'PP' },
  mercadopago: { bg: '#009ee3', label: 'MP' },
  pagbank: { bg: '#7ac143', fg: '#1a3d0c', label: 'PB' },
  neon: { bg: '#00d2f4', fg: '#043b52', label: 'neo' },
  rliima: { bg: 'linear-gradient(135deg,#0f172a,#3b5bdb)', label: 'RL' },
  pix: { bg: '#32bcad', label: '', icone: 'fa-bolt' },
  cash: { bg: '#12855a', label: '', icone: 'fa-money-bill-wave' },
}

/** Nome de exibição de cada banco no seletor da Carteira. */
export const NOMES_MARCA: Record<string, string> = {
  nubank: 'Nubank',
  itau: 'Itaú',
  bradesco: 'Bradesco',
  bb: 'Banco do Brasil',
  caixa: 'Caixa',
  santander: 'Santander',
  inter: 'Inter',
  c6: 'C6 Bank',
  btg: 'BTG Pactual',
  sicoob: 'Sicoob',
  sicredi: 'Sicredi',
  safra: 'Safra',
  picpay: 'PicPay',
  mercadopago: 'Mercado Pago',
  pagbank: 'PagBank',
  neon: 'Neon',
  rliima: 'RLiima',
}

/** Os dez gradientes do seletor de cor. */
export const GRADIENTES: ReadonlyArray<readonly [string, string]> = [
  ['verde', 'linear-gradient(135deg,#0b8a5c,#17b583,#3ad6a4)'],
  ['azul', 'linear-gradient(135deg,#153e90,#2563eb,#60a5fa)'],
  ['rosa', 'linear-gradient(135deg,#b0225a,#ec4899,#ffa1c9)'],
  ['grafite', 'linear-gradient(135deg,#05070a,#1c2430,#3a4656)'],
  ['violeta', 'linear-gradient(135deg,#5a2be2,#8b3df5,#c052e8)'],
  ['laranja', 'linear-gradient(135deg,#c2410c,#f97316,#fdba74)'],
  ['vermelho', 'linear-gradient(135deg,#991b1b,#ef4444,#fca5a5)'],
  ['teal', 'linear-gradient(135deg,#0f766e,#14b8a6,#5eead4)'],
  ['ambar', 'linear-gradient(135deg,#92400e,#f59e0b,#fcd34d)'],
  ['indigo', 'linear-gradient(135deg,#0f172a,#3b5bdb,#818cf8)'],
] as const

const GRADIENTE_MARCA: Record<string, string> = {
  nubank: 'linear-gradient(135deg,#5a189a,#820ad1)',
  itau: 'linear-gradient(135deg,#c74e00,#ec7000)',
  caixa: 'linear-gradient(135deg,#004a75,#0070af)',
  c6: 'linear-gradient(135deg,#111111,#333333)',
  rliima: 'linear-gradient(135deg,#0f172a,#3b5bdb)',
}

const gradienteDeHex = (hex: string) =>
  `linear-gradient(135deg,color-mix(in srgb,${hex} 72%,#000),${hex} 55%,color-mix(in srgb,${hex} 62%,#fff))`

/** Gradiente do cartão a partir do slug do banco. */
export function gradienteDaMarca(slug: string | null | undefined): string {
  if (!slug) return GRADIENTES[0][1]
  if (GRADIENTE_MARCA[slug]) return GRADIENTE_MARCA[slug]
  const marca = MARCAS[slug]
  if (marca && marca.bg.startsWith('#')) return gradienteDeHex(marca.bg)
  return GRADIENTES[0][1]
}

/** Gradiente de cada perfil, usado no card da Carteira. */
export const GRADIENTE_DONO: Record<string, string> = {
  Geral: 'linear-gradient(135deg,#0b8a5c 0%,#17b583 45%,#3ad6a4 100%)',
  Rodolfo: 'linear-gradient(135deg,#153e90,#2563eb,#60a5fa)',
  Thainy: 'linear-gradient(135deg,#b0225a,#ec4899,#ffa1c9)',
  RLiima: 'linear-gradient(135deg,#05070a,#1c2430,#3a4656)',
}

/** Os 40 ícones do seletor de categoria, na ordem do protótipo. */
export const ICONES_CATEGORIA = [
  'house', 'cart-shopping', 'car', 'credit-card', 'bolt', 'clapperboard', 'building',
  'briefcase', 'utensils', 'plane', 'heart-pulse', 'graduation-cap', 'dumbbell', 'shirt',
  'gas-pump', 'bus', 'wifi', 'mobile-screen', 'gift', 'paw', 'baby', 'scissors',
  'screwdriver-wrench', 'book', 'music', 'gamepad', 'basket-shopping', 'mug-hot', 'tooth',
  'spa', 'tv', 'futbol', 'tag', 'piggy-bank', 'sack-dollar', 'receipt', 'wallet',
  'building-columns', 'seedling', 'chart-line',
] as const

/** As 12 cores sólidas do seletor de categoria. */
export const CORES_CATEGORIA = [
  '#5a2be2', '#ff385c', '#0099ff', '#12b48a', '#f5a623', '#c052e8',
  '#0e7490', '#e11d48', '#7c3aed', '#059669', '#d97706', '#475569',
] as const
