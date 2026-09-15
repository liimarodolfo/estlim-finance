import { useState } from 'react'
import { agora } from '@/lib/formatters'
import { confetti } from '@/lib/confetti'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useCategorias } from '@/hooks/useCategorias'
import { useDarBaixa, useDesfazerBaixa, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import { SheetPagamento } from '@/features/lancamentos/SheetPagamento'
import { SheetValor } from '@/features/lancamentos/SheetValor'

/**
 * O ciclo da baixa inteiro num lugar só, porque ele acontece em duas telas: na
 * lista de Lançamentos e nos próximos vencimentos do Dashboard.
 *
 * A regra: a data e a hora são sempre as do clique. Valor fixo já definido
 * conclui num toque. Valor variável ou sem valor abre a confirmação com aquele
 * mesmo instante já preenchido. Tocar num concluído desfaz e recalcula o status.
 */
export function useFluxoDeBaixa() {
  const { data: categorias = [] } = useCategorias()
  const darBaixa = useDarBaixa()
  const desfazer = useDesfazerBaixa()

  const [emFoco, setEmFoco] = useState<LancamentoComBaixa | null>(null)
  const [pagamentoAberto, setPagamentoAberto] = useState(false)
  const [valorAberto, setValorAberto] = useState(false)
  const [recemPago, setRecemPago] = useState<string | null>(null)
  const [momento, setMomento] = useState(agora())

  const categoriaDe = (l: LancamentoComBaixa | null) =>
    categorias.find((c) => c.id === l?.categoria_id)

  const marcar = async (l: LancamentoComBaixa, evento: React.MouseEvent<HTMLButtonElement>) => {
    const instante = agora()

    if (l.status === 'pago') {
      try {
        await desfazer.mutateAsync(l.id!)
        const destino =
          l.tipo === 'investimento' ? 'a investir' : l.tipo === 'receita' ? 'a receber' : 'a pagar'
        toast(`${l.descricao} voltou para ${destino}`, 'fa-rotate-left')
      } catch (erro) {
        toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
      }
      return
    }

    if (l.tipo_valor !== 'fixo' || l.valor_exibido == null) {
      setMomento(instante)
      setEmFoco(l)
      setPagamentoAberto(true)
      return
    }

    const r = evento.currentTarget.getBoundingClientRect()
    try {
      await darBaixa.mutateAsync({
        lancamentoId: l.id!,
        dataPagamento: instante.dataISO,
        horaPagamento: instante.hora,
        valorPago: l.valor_caixa ?? l.valor_exibido,
        formaMetodo: l.forma_metodo,
        formaRef: l.forma_ref,
      })
      confetti(r.left + r.width / 2, r.top)
      setRecemPago(l.id!)
      window.setTimeout(() => setRecemPago(null), 1300)
      const verbo =
        l.tipo === 'investimento' ? 'aplicada' : l.tipo === 'receita' ? 'recebida' : 'paga'
      toast(`${l.descricao} ${verbo} · ${instante.dataBR} às ${instante.hora}`, 'fa-circle-check')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const abrirValor = (l: LancamentoComBaixa) => {
    setEmFoco(l)
    setValorAberto(true)
  }

  const sheets = (
    <>
      <SheetPagamento
        key={`pag-${emFoco?.id ?? ''}-${pagamentoAberto}`}
        aberto={pagamentoAberto}
        aoFechar={() => setPagamentoAberto(false)}
        lancamento={emFoco}
        categoria={categoriaDe(emFoco)}
        momentoDoClique={momento}
      />
      <SheetValor
        key={`valor-${emFoco?.id ?? ''}-${valorAberto}`}
        aberto={valorAberto}
        aoFechar={() => setValorAberto(false)}
        lancamento={emFoco}
        categoria={categoriaDe(emFoco)}
      />
    </>
  )

  return { marcar, abrirValor, recemPago, sheets }
}
