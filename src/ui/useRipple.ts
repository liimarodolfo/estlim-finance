import { useEffect } from 'react'

const ALVOS =
  '.btn-primary,.chip,.month-pill,.icon-btn,.mini-btn,.nav-item,.btn-sm,.btn-del-ico,.ajuste-btn,.avatar,.btn-ghost-inline,.seg button,.sheet-close'

/** Ripple global nos controles, igual ao prototipo. Respeita prefers-reduced-motion. */
export function useRipple() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const aoTocar = (e: PointerEvent) => {
      const alvo = (e.target as HTMLElement | null)?.closest<HTMLElement>(ALVOS)
      if (!alvo) return
      const onda = document.createElement('span')
      onda.className = 'ripple'
      const r = alvo.getBoundingClientRect()
      const tamanho = Math.max(r.width, r.height)
      onda.style.width = `${tamanho}px`
      onda.style.height = `${tamanho}px`
      onda.style.left = `${e.clientX - r.left - tamanho / 2}px`
      onda.style.top = `${e.clientY - r.top - tamanho / 2}px`
      alvo.appendChild(onda)
      window.setTimeout(() => onda.remove(), 650)
    }

    document.addEventListener('pointerdown', aoTocar)
    return () => document.removeEventListener('pointerdown', aoTocar)
  }, [])
}
