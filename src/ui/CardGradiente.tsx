import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Gradiente completo em CSS. Sem isso, usa o gradiente da marca. */
  gradiente?: string
  /** wallet-summary tem padding um pouco menor que o hero-card. */
  variante?: 'hero' | 'carteira'
  className?: string
  style?: CSSProperties
}

/**
 * Card de gradiente com a deriva lenta, o brilho difuso e a trama de pontos.
 * Todo o movimento vem do CSS do protótipo, inclusive o respeito ao
 * prefers-reduced-motion.
 */
export function CardGradiente({ children, gradiente, variante = 'hero', className, style }: Props) {
  const base = variante === 'hero' ? 'hero-card' : 'wallet-summary'
  return (
    <div
      className={className ? `${base} ${className}` : base}
      style={gradiente ? { background: gradiente, backgroundSize: '180% 180%', ...style } : style}
    >
      {children}
    </div>
  )
}
