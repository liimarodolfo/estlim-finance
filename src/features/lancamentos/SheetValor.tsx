import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { fmtData } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useDefinirValor, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import type { Categoria } from '@/types/database'

type Props = {
  aberto: boolean
  aoFechar: () => void
  lancamento: LancamentoComBaixa | null
  categoria: Categoria | undefined
}

/**
 * Preenche o valor de um lançamento variável que nasceu sem valor. Não dá baixa:
 * só tira o selo "Adicionar valor" da lista e devolve o mês à previsibilidade.
 */
export function SheetValor({ aberto, aoFechar, lancamento, categoria }: Props) {
  const definir = useDefinirValor()
  const [valor, setValor] = useState<number | null>(null)

  const salvar = async () => {
    if (!lancamento?.id) return
    if (!valor || valor <= 0) {
      toast('Informe o valor previsto', 'fa-triangle-exclamation')
      return
    }
    try {
      await definir.mutateAsync({ id: lancamento.id, valor })
      toast(`Valor de ${lancamento.descricao} definido`, 'fa-tag')
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  if (!lancamento) return null

  const cor = categoria?.cor ?? 'var(--accent)'
  const icone = categoria?.icone ?? 'fa-tag'

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Adicionar valor"
      icone="fa-tag"
      corIcone="var(--accent)"
      acoes={
        <BotaoPill icone="fa-check" aoClicar={salvar} ocupado={definir.isPending}>
          Salvar valor
        </BotaoPill>
      }
    >
      <div className="pay-resume">
        <div className="tx-icon" style={{ background: `${cor}1e`, color: cor }}>
          <i className={`fa-solid ${icone}`} aria-hidden="true" />
        </div>
        <div>
          <b>{lancamento.descricao}</b>
          <span>
            Vence {fmtData(lancamento.data_vencimento)} · conta variável
            {lancamento.pagar_a ? ` · ${lancamento.pagar_a}` : ''}
          </span>
        </div>
      </div>

      <Campo id="prVal" rotulo="Valor previsto (R$)" icone="fa-brazilian-real-sign">
        <InputMoeda id="prVal" valor={valor} aoMudar={setValor} />
      </Campo>

      <div className="bl-formula">
        Isso só preenche a previsão do mês. A baixa continua no check da lista.
      </div>
    </Sheet>
  )
}
