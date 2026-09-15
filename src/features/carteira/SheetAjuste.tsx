import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { fmtMoeda } from '@/lib/formatters'
import { toast } from '@/store/useToasts'
import { useCriarAjuste } from '@/hooks/useCarteiras'
import type { Carteira, TipoAjuste } from '@/types/database'
import { mensagemDeErro } from '@/lib/erros'

type Props = {
  aberto: boolean
  aoFechar: () => void
  /** Já chega filtrado pelas contas do dono selecionado na tela. */
  contas: Carteira[]
}

export function SheetAjuste({ aberto, aoFechar, contas }: Props) {
  const criar = useCriarAjuste()
  const [tipo, setTipo] = useState<TipoAjuste>('entrada')
  const [contaId, setContaId] = useState(contas[0]?.id ?? '')
  const [valor, setValor] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  const conta = contas.find((c) => c.id === contaId) ?? contas[0]

  const aplicar = async () => {
    if (!conta) {
      toast('Cadastre uma conta antes de ajustar o saldo', 'fa-triangle-exclamation')
      return
    }
    if (!valor || valor <= 0) {
      toast('Informe o valor do ajuste', 'fa-triangle-exclamation')
      return
    }
    // O banco valida o motivo de novo antes de encostar no saldo. Aqui é só
    // para o usuário não levar um erro de servidor por algo tão simples.
    if (!motivo.trim()) {
      toast('O motivo é obrigatório para ajustar o saldo', 'fa-triangle-exclamation')
      return
    }

    try {
      await criar.mutateAsync({ carteiraId: conta.id, tipo, valor, motivo: motivo.trim() })
      toast(
        `${tipo === 'entrada' ? 'Entrada' : 'Retirada'} de ${fmtMoeda(valor)} aplicada em ${conta.nome}`,
        'fa-scale-balanced',
      )
      setValor(null)
      setMotivo('')
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Ajuste de carteira"
      icone="fa-scale-balanced"
      acoes={
        <BotaoPill icone="fa-check" aoClicar={aplicar} ocupado={criar.isPending}>
          Aplicar ajuste
        </BotaoPill>
      }
    >
      <div className="seg">
        <button
          type="button"
          className={tipo === 'entrada' ? 'active receita' : ''}
          onClick={() => setTipo('entrada')}
        >
          <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
          Entrada
        </button>
        <button
          type="button"
          className={tipo === 'retirada' ? 'active despesa' : ''}
          onClick={() => setTipo('retirada')}
        >
          <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
          Retirada
        </button>
      </div>

      <Campo id="aConta" rotulo="Conta a nivelar" icone="fa-building-columns">
        <select id="aConta" value={contaId} onChange={(e) => setContaId(e.target.value)}>
          {contas.length === 0 ? <option value="">Nenhuma conta cadastrada</option> : null}
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} · {c.dono} · {fmtMoeda(c.saldo)}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="aValor" rotulo="Valor do ajuste (R$)" icone="fa-brazilian-real-sign">
        <InputMoeda id="aValor" valor={valor} aoMudar={setValor} />
      </Campo>

      <Campo id="aMotivo" rotulo="Motivo" icone="fa-comment-dots" obrigatorio>
        <input
          id="aMotivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: nivelamento do balanço de setembro"
        />
      </Campo>

      <div className="bl-formula">
        O ajuste vira um lançamento pago na categoria Ajuste de saldo, com data, hora, valor, conta e
        este motivo. Sem motivo, o saldo não se move.
      </div>
    </Sheet>
  )
}
