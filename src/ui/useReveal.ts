import { useEffect } from 'react'

/**
 * Revela cards ao entrar na tela e dispara as barras, os anéis do donut e as
 * barras de consumo, que começam em zero e crescem até o valor de data-*.
 * Roda de novo a cada troca de dependência, para conteúdo recém renderizado.
 */
export function useReveal(dependencias: unknown[] = []) {
  useEffect(() => {
    const preencher = (raiz: ParentNode) => {
      raiz.querySelectorAll<HTMLElement>('.bar[data-h]').forEach((b) => {
        b.style.height = b.dataset.h ?? '0'
      })
      raiz.querySelectorAll<SVGElement>('.donut-seg[data-dash]').forEach((s) => {
        s.setAttribute('stroke-dasharray', s.dataset.dash ?? '0 100')
      })
      raiz.querySelectorAll<HTMLElement>('.limit-fill[data-w],.cat-fill[data-w],.bal-fill[data-w]').forEach((f) => {
        f.style.width = f.dataset.w ?? '0'
      })
    }

    const observador = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return
          const el = entrada.target as HTMLElement
          el.classList.add('in')
          preencher(el)
          observador.unobserve(el)
        }),
      { threshold: 0.15 },
    )

    // Seleciona sempre todos e pula os que ja revelaram, em vez de filtrar por
    // data-reveal. Com o StrictMode o efeito monta duas vezes, e filtrar pelo
    // atributo deixava a segunda passada sem observar nada, travando em opacidade
    // zero tudo que estivesse abaixo da dobra.
    document
      .querySelectorAll<HTMLElement>('.view.active .card, .view.active .credit-card')
      .forEach((el) => {
        if (el.classList.contains('in')) return
        el.dataset.reveal = ''
        observador.observe(el)
      })

    // Card ja revelado que recebeu conteudo novo precisa preencher de novo.
    const quadro = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.querySelectorAll<HTMLElement>('.view.active [data-reveal].in').forEach(preencher),
      ),
    )

    return () => {
      observador.disconnect()
      cancelAnimationFrame(quadro)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias)
}
