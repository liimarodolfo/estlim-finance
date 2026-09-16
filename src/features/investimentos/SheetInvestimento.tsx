import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { toast } from '@/store/useToasts'
import { useCarteiras } from '@/hooks/useCarteiras'
import {
  useCorretoras,
  useExcluirInvestimento,
  useSalvarInvestimento,
} from '@/hooks/useInvestimentos'
import type { Dono, Investimento, SubInvestimento, TipoInstituicao } from '@/types/database'
import { mensagemDeErro } from '@/lib/erros'

const DONOS: Dono[] = ['Rodolfo', 'Thainy', 'RLiima']

type Props = {
  aberto: boolean
  aoFechar: () => void
  investimento: Investimento | null
  aoPedirCorretora: () => void
}

export function SheetInvestimento({ aberto, aoFechar, investimento, aoPedirCorretora }: Props) {
  const editando = investimento !== null
  const { data: carteiras = [] } = useCarteiras()
  const { data: corretoras = [] } = useCorretoras()
  const salvar = useSalvarInvestimento()
  const excluir = useExcluirInvestimento()

  const contas = carteiras.filter((c) => c.tipo === 'conta')

  const [sub, setSub] = useState<SubInvestimento>(investimento?.sub ?? 'ativo')
  const [nome, setNome] = useState(investimento?.nome ?? '')
  const [descricao, setDescricao] = useState(investimento?.descricao ?? '')
  const [valor, setValor] = useState<number | null>(investimento?.valor ?? null)
  const [rentabilidade, setRentabilidade] = useState(investimento?.rentabilidade ?? '')
  const [instituicao, setInstituicao] = useState<TipoInstituicao>(
    investimento?.instituicao_tipo ?? 'banco',
  )
  const [contaId, setContaId] = useState(investimento?.carteira_id ?? '')
  const [corretoraId, setCorretoraId] = useState(investimento?.corretora_id ?? '')
  const [dono, setDono] = useState<Dono>(investimento?.dono ?? 'Rodolfo')

  const aoSalvar = async () => {
    if (!nome.trim()) {
      toast('Informe o nome do investimento', 'fa-triangle-exclamation')
      return
    }
    const referencia = instituicao === 'banco' ? contaId || contas[0]?.id : corretoraId || corretoras[0]?.id
    if (!referencia) {
      toast(
        instituicao === 'banco'
          ? 'Cadastre uma conta na Carteira antes'
          : 'Cadastre uma corretora antes',
        'fa-triangle-exclamation',
      )
      return
    }

    try {
      await salvar.mutateAsync({
        id: investimento?.id ?? null,
        dados: {
          sub,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          valor: valor ?? 0,
          rentabilidade: rentabilidade.trim() || null,
          instituicao_tipo: instituicao,
          // O banco recusa os dois preenchidos ao mesmo tempo, então um deles
          // sempre vai nulo, conforme o tipo de instituição escolhido.
          carteira_id: instituicao === 'banco' ? referencia : null,
          corretora_id: instituicao === 'corretora' ? referencia : null,
          dono,
        },
      })
      toast(
        editando ? 'Investimento atualizado' : `${nome.trim()} adicionado ao patrimônio`,
        editando ? 'fa-pen' : 'fa-seedling',
      )
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoExcluir = async () => {
    if (!investimento) return
    try {
      const aportes = await excluir.mutateAsync(investimento.id)
      toast(
        aportes > 0
          ? `${investimento.nome} removido. ${aportes} aporte${aportes === 1 ? '' : 's'} continua${aportes === 1 ? '' : 'm'} no histórico, sem destino.`
          : `${investimento.nome} removido do patrimônio`,
        'fa-trash',
      )
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? 'Editar investimento' : 'Novo investimento'}
      icone="fa-seedling"
      corIcone="var(--invest)"
      acoes={
        <div className="sheet-actions">
          <BotaoPill icone="fa-check" aoClicar={aoSalvar} ocupado={salvar.isPending}>
            Salvar investimento
          </BotaoPill>
          {editando ? <BotaoExcluir aoClicar={aoExcluir} titulo="Excluir investimento" /> : null}
        </div>
      }
    >
      <div className="seg">
        <button
          type="button"
          className={sub === 'ativo' ? 'active investimento' : ''}
          onClick={() => setSub('ativo')}
        >
          <i className="fa-solid fa-chart-line" aria-hidden="true" />
          Ativo
        </button>
        <button
          type="button"
          className={sub === 'caixinha' ? 'active investimento' : ''}
          onClick={() => setSub('caixinha')}
        >
          <i className="fa-solid fa-piggy-bank" aria-hidden="true" />
          Caixinha
        </button>
      </div>

      <Campo id="iNome" rotulo="Nome" icone="fa-signature">
        <input
          id="iNome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={sub === 'ativo' ? 'Ex: Tesouro Selic 2029' : 'Ex: Caixinha Viagem'}
        />
      </Campo>

      <Campo id="iDesc" rotulo="Descrição" icone="fa-file-lines">
        <input
          id="iDesc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: reserva de emergência, liquidez diária"
        />
      </Campo>

      <div className="field-row">
        <Campo id="iValor" rotulo="Valor aplicado (R$)" icone="fa-brazilian-real-sign">
          <InputMoeda id="iValor" valor={valor} aoMudar={setValor} />
        </Campo>
        <Campo id="iRent" rotulo="Rentabilidade" icone="fa-percent">
          <input
            id="iRent"
            value={rentabilidade}
            onChange={(e) => setRentabilidade(e.target.value)}
            placeholder="Ex: 110% CDI"
          />
        </Campo>
      </div>

      <Campo rotulo="Onde está aplicado" icone="fa-building-columns">
        <div className="seg" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={instituicao === 'banco' ? 'active receita' : ''}
            onClick={() => setInstituicao('banco')}
          >
            <i className="fa-solid fa-building-columns" aria-hidden="true" />
            Banco
          </button>
          <button
            type="button"
            className={instituicao === 'corretora' ? 'active receita' : ''}
            onClick={() => setInstituicao('corretora')}
          >
            <i className="fa-solid fa-chart-simple" aria-hidden="true" />
            Corretora
          </button>
        </div>
      </Campo>

      {instituicao === 'banco' ? (
        <Campo id="iBanco" rotulo="Conta" icone="fa-wallet">
          <select id="iBanco" value={contaId} onChange={(e) => setContaId(e.target.value)}>
            {contas.length === 0 ? (
              <option value="">Cadastre uma conta na Carteira</option>
            ) : (
              contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {c.dono}
                </option>
              ))
            )}
          </select>
        </Campo>
      ) : (
        <Campo id="iCorretora" rotulo="Corretora" icone="fa-chart-simple">
          <div className="corretora-linha">
            <select
              id="iCorretora"
              style={{ flex: 1 }}
              value={corretoraId}
              onChange={(e) => setCorretoraId(e.target.value)}
            >
              {corretoras.length === 0 ? (
                <option value="">Cadastre uma corretora</option>
              ) : (
                corretoras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="btn-ghost-inline"
              onClick={aoPedirCorretora}
              title="Cadastrar corretora"
              aria-label="Cadastrar corretora"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          </div>
        </Campo>
      )}

      <Campo id="iDono" rotulo="Titular" icone="fa-user-group">
        <select id="iDono" value={dono} onChange={(e) => setDono(e.target.value as Dono)}>
          {DONOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Campo>
    </Sheet>
  )
}
