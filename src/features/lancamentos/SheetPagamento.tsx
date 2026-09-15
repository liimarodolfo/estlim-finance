import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputData } from '@/ui/InputData'
import { InputHora } from '@/ui/InputHora'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { agora, fmtData, fmtMoeda, paraISO } from '@/lib/formatters'
import { METODO_ICONE, fontesPara, metodosPara, rotuloDaFonte } from '@/lib/formas'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { confetti } from '@/lib/confetti'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useDarBaixa, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import type { Categoria, MetodoPagamento } from '@/types/database'

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

type Props = {
  aberto: boolean
  aoFechar: () => void
  lancamento: LancamentoComBaixa | null
  categoria: Categoria | undefined
  /** Momento exato do clique no check, capturado antes de abrir o sheet. */
  momentoDoClique: { dataBR: string; hora: string }
}

/**
 * Fluxo com confirmação: vale para lançamento de valor variável ou sem valor.
 * A data e a hora já chegam preenchidas com o instante do clique no check, e o
 * usuário só ajusta se quiser.
 */
export function SheetPagamento({ aberto, aoFechar, lancamento, categoria, momentoDoClique }: Props) {
  const { data: carteiras = [] } = useCarteiras()
  const darBaixa = useDarBaixa()

  const aporte = lancamento?.tipo === 'investimento'
  const receita = lancamento?.tipo === 'receita'

  const [data, setData] = useState(momentoDoClique.dataBR)
  const [hora, setHora] = useState(momentoDoClique.hora)
  // O campo traz o valor de CAIXA, não o de competência: na fatura do cartão o
  // banco cobra o cheio, e é esse valor que sai da conta. A lista mostra o
  // líquido, já sem o que foi lançado em detalhe, e são coisas diferentes.
  const [valor, setValor] = useState<number | null>(
    lancamento?.valor_caixa ?? lancamento?.valor_exibido ?? null,
  )
  const [metodo, setMetodo] = useState<MetodoPagamento>(lancamento?.forma_metodo ?? 'pix')
  const [fonte, setFonte] = useState(lancamento?.forma_ref ?? '')

  const fontes = fontesPara(metodo, carteiras)

  const confirmar = async (evento: React.MouseEvent<HTMLButtonElement>) => {
    if (!lancamento?.id) return
    if (!valor || valor <= 0) {
      toast(
        aporte ? 'Informe o valor aplicado' : receita ? 'Informe o valor recebido' : 'Informe o valor pago',
        'fa-triangle-exclamation',
      )
      return
    }
    // O retangulo e lido antes do await: depois dele o sheet ja fechou.
    const r = evento.currentTarget.getBoundingClientRect()
    const alvo = { esquerda: r.left + r.width / 2, topo: r.top }
    const agoraMesmo = agora()
    const dataISO = paraISO(data) ?? agoraMesmo.dataISO
    const horaFinal = HORA_VALIDA.test(hora) ? hora : agoraMesmo.hora

    try {
      await darBaixa.mutateAsync({
        lancamentoId: lancamento.id,
        dataPagamento: dataISO,
        horaPagamento: horaFinal,
        valorPago: valor,
        formaMetodo: metodo,
        formaRef: fonte || fontes[0]?.[0] || null,
      })
      confetti(alvo.esquerda, alvo.topo)
      toast(
        `${lancamento.descricao} ${aporte ? 'aplicada' : receita ? 'recebida' : 'paga'} · ${fmtData(dataISO)} às ${horaFinal}`,
        'fa-circle-check',
      )
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  if (!lancamento) return null

  const cor = categoria?.cor ?? 'var(--muted)'
  const icone = categoria?.icone ?? (aporte ? 'fa-seedling' : 'fa-tag')

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Confirmar ${aporte ? 'aporte' : receita ? 'recebimento' : 'pagamento'}`}
      icone={aporte ? 'fa-seedling' : 'fa-circle-check'}
      corIcone={aporte ? 'var(--invest)' : 'var(--income)'}
      acoes={
        <BotaoPill
          icone="fa-check"
          variante={aporte ? 'primario' : 'verde'}
          aoClicar={confirmar}
          ocupado={darBaixa.isPending}
        >
          {aporte ? 'Confirmar aporte' : receita ? 'Confirmar recebimento' : 'Confirmar pagamento'}
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
            {aporte ? 'Aplicar em' : receita ? 'Receber de' : 'Pagar a'} {lancamento.pagar_a ?? '--'} ·
            previsto {lancamento.valor_exibido == null ? 'a definir' : fmtMoeda(lancamento.valor_exibido)} ·
            vence {fmtData(lancamento.data_vencimento)}
          </span>
        </div>
      </div>

      <div className="field-row">
        <Campo
          id="pData"
          rotulo={aporte ? 'Data do aporte' : receita ? 'Data do recebimento' : 'Data do pagamento'}
          icone="fa-calendar-day"
        >
          <InputData id="pData" valor={data} aoMudar={setData} />
        </Campo>
        <Campo id="pHora" rotulo="Hora (24h)" icone="fa-clock">
          <InputHora id="pHora" valor={hora} aoMudar={setHora} />
        </Campo>
      </div>

      <Campo
        id="pVal"
        rotulo={aporte ? 'Valor aplicado (R$)' : receita ? 'Valor recebido (R$)' : 'Valor pago (R$)'}
        icone="fa-brazilian-real-sign"
      >
        <InputMoeda id="pVal" valor={valor} aoMudar={setValor} />
      </Campo>

      <div className="field-row">
        <Campo
          id="pMetodo"
          rotulo={receita ? 'Forma de recebimento' : 'Forma de pagamento'}
          icone="fa-wallet"
        >
          <select
            id="pMetodo"
            value={metodo}
            onChange={(e) => {
              setMetodo(e.target.value as MetodoPagamento)
              setFonte('')
            }}
          >
            {metodosPara(lancamento.tipo!).map(([valorMetodo, rotulo]) => (
              <option key={valorMetodo} value={valorMetodo}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pFonte" rotulo={rotuloDaFonte(metodo)} icone={METODO_ICONE[metodo]}>
          <select id="pFonte" value={fonte} onChange={(e) => setFonte(e.target.value)}>
            {fontes.length === 0 ? (
              <option value="">Cadastre na Carteira primeiro</option>
            ) : (
              fontes.map(([id, rotulo]) => (
                <option key={id} value={id}>
                  {rotulo}
                </option>
              ))
            )}
          </select>
        </Campo>
      </div>

      <div className="bl-formula">
        A data e a hora acima são o momento em que você tocou no check. Pode ajustar se a baixa
        aconteceu antes.
      </div>
    </Sheet>
  )
}
