const CORES = ['#5a2be2', '#ff385c', '#0099ff', '#12b48a', '#f5a623', '#c052e8']

/** Estouro de confete no ponto do clique, igual ao do protótipo. */
export function confetti(x: number, y: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('span')
    p.className = 'confetti'
    p.style.left = `${x}px`
    p.style.top = `${y}px`
    p.style.background = CORES[i % CORES.length]
    p.style.setProperty('--cx', `${Math.random() * 180 - 90}px`)
    p.style.setProperty('--cy', `${Math.random() * -160 - 30}px`)
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
    document.body.appendChild(p)
    window.setTimeout(() => p.remove(), 980)
  }
}
