import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { fmtData, fmtMoeda } from '@/lib/formatters'
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
 *
 * Na fatura do cartão ele tem outro papel: é aqui que o ciclo fecha. Ela vem
 * acumulando as compras lançadas, e o valor confirmado nunca pode ser menor que
 * essa soma, senão sobraria um excedente negativo. O que passa da soma é o que
 * entrou na fatura sem ter sido lançado em detalhe.
 */
export function SheetValor({ aberto, aoFechar, lancamento, categoria }: Props) {
  const definir = useDefinirValor()
  const ehFatura = Boolean(lancamento?.cartao_id)
  const acumulado = lancamento?.valor_detalhado ?? 0
  const itens = lancamento?.itens_no_ciclo ?? 0
  const [valor, setValor] = useState<number | null>(ehFatura ? (lancamento?.valor_caixa ?? null) : null)

  const salvar = async () => {
    if (!lancamento?.id) return
    if (!valor || valor <= 0) {
      toast(ehFatura ? 'Informe o valor fechado da fatura' : 'Informe o valor previsto', 'fa-triangle-exclamation')
      return
    }
    if (ehFatura && valor < acumulado) {
      toast(
        `A fatura não pode fechar abaixo de ${fmtMoeda(acumulado)}, que já foi lançado nela`,
        'fa-triangle-exclamation',
      )
      return
    }
    try {
      await definir.mutateAsync({ id: lancamento.id, valor })
      toast(
        ehFatura
          ? `${lancamento.descricao} fechada em ${fmtMoeda(valor)}`
          : `Valor de ${lancamento.descricao} definido`,
        ehFatura ? 'fa-file-invoice-dollar' : 'fa-tag',
      )
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
      titulo={ehFatura ? 'Fechar a fatura' : 'Adicionar valor'}
      icone={ehFatura ? 'fa-file-invoice-dollar' : 'fa-tag'}
      corIcone="var(--accent)"
      acoes={
        <BotaoPill icone="fa-check" aoClicar={salvar} ocupado={definir.isPending}>
          {ehFatura ? 'Confirmar fatura' : 'Salvar valor'}
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
            {ehFatura
              ? `Vence ${fmtData(lancamento.data_vencimento)} · ${
                  itens === 0
                    ? 'nenhuma compra lançada'
                    : `${itens} compra${itens > 1 ? 's' : ''} somando ${fmtMoeda(acumulado)}`
                }`
              : `Vence ${fmtData(lancamento.data_vencimento)} · conta variável${
                  lancamento.pagar_a ? ` · ${lancamento.pagar_a}` : ''
                }`}
          </span>
        </div>
      </div>

      <Campo
        id="prVal"
        rotulo={ehFatura ? 'Valor fechado da fatura (R$)' : 'Valor previsto (R$)'}
        icone="fa-brazilian-real-sign"
      >
        <InputMoeda id="prVal" valor={valor} aoMudar={setValor} />
      </Campo>

      <div className="bl-formula">
        {ehFatura ? (
          <>
            Digite o valor fechado como aparece no app do banco. As {itens === 1 ? 'compra' : 'compras'}
            {' '}já lançada{itens === 1 ? '' : 's'} {itens === 1 ? 'soma' : 'somam'} {fmtMoeda(acumulado)} e
            continua{itens === 1 ? '' : 'm'} na categoria de cada uma. A diferença aparece como gasto do
            cartão, que é o que entrou na fatura sem ter sido lançado aqui. Depois de confirmada, compra
            nova neste cartão vai para a próxima fatura.
          </>
        ) : (
          'Isso só preenche a previsão do mês. A baixa continua no check da lista.'
        )}
      </div>
    </Sheet>
  )
}
