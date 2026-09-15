import { useEffect, useRef } from 'react'
import { fmtMoeda } from '@/lib/formatters'

type Props = {
  valor: number
  className?: string
  /** Fora de moeda, para contagens simples. */
  formatar?: (v: number) => string
}

const DURACAO = 900

/** Conta até o valor ao trocar de mês. Com movimento reduzido, já entra pronto. */
export function NumeroAnimado({ valor, className, formatar = fmtMoeda }: Props) {
  const alvo = useRef<HTMLSpanElement>(null)
  const anterior = useRef(0)

  useEffect(() => {
    const el = alvo.current
    if (!el) return

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const escondido = document.visibilityState !== 'visible'
    const de = anterior.current
    const para = valor
    anterior.current = valor

    // Aba oculta nao roda requestAnimationFrame. Sem esta saida, o numero ficava
    // congelado no valor antigo ate alguem interagir com a pagina.
    if (reduzido || escondido || de === para) {
      el.textContent = formatar(para)
      return
    }

    const inicio = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO)
      const suave = 1 - Math.pow(1 - t, 3)
      el.textContent = formatar(de + (para - de) * suave)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)

    // Rede de seguranca: se a animacao for interrompida no meio, o valor final
    // aparece assim mesmo. Numero de dinheiro errado na tela e pior que sem animacao.
    const garantia = window.setTimeout(() => {
      el.textContent = formatar(para)
    }, DURACAO + 80)

    return () => {
      cancelAnimationFrame(quadro)
      window.clearTimeout(garantia)
    }
  }, [valor, formatar])

  return <span ref={alvo} className={className} />
}
