import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { SeletorCor } from '@/ui/SeletorCor'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { GRADIENTES, NOMES_MARCA, gradienteDaMarca } from '@/lib/marcas'
import { toast } from '@/store/useToasts'
import { useExcluirCarteira, useSalvarCarteira, type NovaCarteira } from '@/hooks/useCarteiras'
import type { Carteira, Dono, TipoCarteira } from '@/types/database'

const DONOS: Dono[] = ['Rodolfo', 'Thainy', 'RLiima']
const BANDEIRAS = [
  ['mastercard', 'Mastercard'],
  ['visa', 'Visa'],
  ['elo', 'Elo'],
] as const

const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro))

const soDia = (valor: string): string => {
  const n = valor.replace(/\D/g, '').slice(0, 2)
  return n
}

type Props = {
  aberto: boolean
  aoFechar: () => void
  /** null abre em branco, com o tipo escolhido pelo botão que chamou. */
  carteira: Carteira | null
  tipoInicial: TipoCarteira
  donoInicial: Dono
}

export function SheetCarteira({ aberto, aoFechar, carteira, tipoInicial, donoInicial }: Props) {
  const editando = carteira !== null
  const salvar = useSalvarCarteira()
  const excluir = useExcluirCarteira()

  const [tipo, setTipo] = useState<TipoCarteira>(carteira?.tipo ?? tipoInicial)
  const [nome, setNome] = useState(carteira?.nome ?? '')
  const [dono, setDono] = useState<Dono>(carteira?.dono ?? donoInicial)
  const [banco, setBanco] = useState(carteira?.banco ?? 'nubank')
  const [bancoNome, setBancoNome] = useState(carteira?.banco_nome ?? '')
  const [descricao, setDescricao] = useState(carteira?.descricao ?? '')
  const [cor, setCor] = useState(carteira?.cor_gradiente ?? gradienteDaMarca(carteira?.banco ?? 'nubank'))
  const [saldo, setSaldo] = useState<number | null>(carteira?.saldo ?? 0)
  const [bandeira, setBandeira] = useState(carteira?.bandeira ?? 'mastercard')
  const [funcao, setFuncao] = useState(carteira?.funcao ?? '')
  const [limite, setLimite] = useState<number | null>(carteira?.limite ?? null)
  const [usado, setUsado] = useState<number | null>(carteira?.usado ?? null)
  const [fecha, setFecha] = useState(carteira?.dia_fechamento ? String(carteira.dia_fechamento) : '')
  const [vence, setVence] = useState(carteira?.dia_vencimento ? String(carteira.dia_vencimento) : '')

  const trocarBanco = (novo: string) => {
    setBanco(novo)
    // A cor acompanha o banco enquanto o usuário não escolher uma à mão.
    if (novo !== 'outro') setCor(gradienteDaMarca(novo))
  }

  const aoSalvar = async () => {
    if (!nome.trim()) {
      toast('Informe o nome', 'fa-triangle-exclamation')
      return
    }
    if (banco === 'outro' && !bancoNome.trim()) {
      toast('Digite o nome do banco', 'fa-triangle-exclamation')
      return
    }
    const diaFecha = fecha ? Number(fecha) : null
    const diaVence = vence ? Number(vence) : null
    if (tipo === 'cartao') {
      if (!limite || limite <= 0) {
        toast('Informe o limite do cartão', 'fa-triangle-exclamation')
        return
      }
      if (!diaVence || diaVence < 1 || diaVence > 31) {
        toast('Informe o dia de vencimento, de 1 a 31', 'fa-triangle-exclamation')
        return
      }
      if (diaFecha !== null && (diaFecha < 1 || diaFecha > 31)) {
        toast('O dia de fechamento vai de 1 a 31', 'fa-triangle-exclamation')
        return
      }
    }

    const dados: NovaCarteira = {
      tipo,
      nome: nome.trim(),
      dono,
      banco: banco === 'outro' ? 'custom' : banco,
      banco_nome: banco === 'outro' ? bancoNome.trim() : null,
      descricao: descricao.trim() || null,
      cor_gradiente: cor,
      saldo: tipo === 'conta' ? (saldo ?? 0) : 0,
      bandeira: tipo === 'cartao' ? bandeira : null,
      funcao: tipo === 'cartao' ? funcao.trim() || null : null,
      limite: tipo === 'cartao' ? (limite ?? 0) : 0,
      usado: tipo === 'cartao' ? (usado ?? 0) : 0,
      dia_fechamento: tipo === 'cartao' ? diaFecha : null,
      dia_vencimento: tipo === 'cartao' ? diaVence : null,
    }

    try {
      await salvar.mutateAsync({ id: carteira?.id ?? null, dados })
      toast(editando ? 'Carteira atualizada' : `${tipo === 'conta' ? 'Conta' : 'Cartão'} criado`, 'fa-circle-check')
      aoFechar()
    } catch (erro) {
      toast(mensagem(erro), 'fa-triangle-exclamation')
    }
  }

  const aoExcluir = async () => {
    if (!carteira) return
    try {
      const resultado = await excluir.mutateAsync(carteira.id)
      toast(
        resultado === 'arquivada'
          ? 'Tem histórico, então foi arquivada em vez de apagada'
          : 'Excluída da carteira',
        resultado === 'arquivada' ? 'fa-box-archive' : 'fa-trash',
      )
      aoFechar()
    } catch (erro) {
      toast(mensagem(erro), 'fa-triangle-exclamation')
    }
  }

  const titulo = editando
    ? carteira.tipo === 'conta'
      ? 'Editar conta'
      : 'Editar cartão'
    : tipo === 'conta'
      ? 'Nova conta'
      : 'Novo cartão'

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      icone={tipo === 'conta' ? 'fa-building-columns' : 'fa-credit-card'}
      acoes={
        <div className="sheet-actions">
          <BotaoPill icone="fa-check" aoClicar={aoSalvar} ocupado={salvar.isPending}>
            Salvar
          </BotaoPill>
          {editando ? <BotaoExcluir aoClicar={aoExcluir} titulo="Excluir da carteira" /> : null}
        </div>
      }
    >
      {/* Trocar de tipo só faz sentido no cadastro novo. */}
      {!editando ? (
        <div className="seg">
          <button
            type="button"
            className={tipo === 'conta' ? 'active receita' : ''}
            onClick={() => setTipo('conta')}
          >
            <i className="fa-solid fa-building-columns" aria-hidden="true" />
            Conta
          </button>
          <button
            type="button"
            className={tipo === 'cartao' ? 'active despesa' : ''}
            onClick={() => setTipo('cartao')}
          >
            <i className="fa-solid fa-credit-card" aria-hidden="true" />
            Cartão
          </button>
        </div>
      ) : null}

      <Campo id="wNome" rotulo="Nome" icone="fa-signature">
        <input
          id="wNome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={tipo === 'conta' ? 'Ex: Nubank Conta' : 'Ex: Nubank Ultravioleta'}
        />
      </Campo>

      <div className="field-row">
        <Campo id="wDono" rotulo="Dono" icone="fa-user">
          <select id="wDono" value={dono} onChange={(e) => setDono(e.target.value as Dono)}>
            {DONOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="wBanco" rotulo="Banco" icone="fa-building-columns">
          <select id="wBanco" value={banco} onChange={(e) => trocarBanco(e.target.value)}>
            {Object.entries(NOMES_MARCA).map(([slug, rotulo]) => (
              <option key={slug} value={slug}>
                {rotulo}
              </option>
            ))}
            <option value="outro">Outro (digitar)</option>
          </select>
        </Campo>
      </div>

      {banco === 'outro' || banco === 'custom' ? (
        <Campo id="wBancoNome" rotulo="Nome do banco" icone="fa-pen">
          <input
            id="wBancoNome"
            value={bancoNome}
            onChange={(e) => setBancoNome(e.target.value)}
            placeholder="Digite o nome do banco"
          />
        </Campo>
      ) : null}

      <Campo id="wDescricao" rotulo="Descrição" icone="fa-hashtag">
        <input
          id="wDescricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={tipo === 'conta' ? 'Ex: Ag 0912 · CC 34871-2' : 'Ex: final 4821'}
        />
      </Campo>

      <Campo rotulo="Cor" icone="fa-palette">
        <SeletorCor valor={cor} aoEscolher={setCor} />
      </Campo>

      {tipo === 'conta' ? (
        <Campo id="wSaldo" rotulo="Saldo atual (R$)" icone="fa-brazilian-real-sign">
          <InputMoeda id="wSaldo" valor={saldo} aoMudar={setSaldo} />
        </Campo>
      ) : (
        <>
          <div className="field-row">
            <Campo id="wBandeira" rotulo="Bandeira" icone="fa-credit-card">
              <select id="wBandeira" value={bandeira} onChange={(e) => setBandeira(e.target.value)}>
                {BANDEIRAS.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="wLimite" rotulo="Limite (R$)" icone="fa-gauge-high">
              <InputMoeda id="wLimite" valor={limite} aoMudar={setLimite} />
            </Campo>
          </div>
          <div className="field-row">
            <Campo id="wUsado" rotulo="Usado (R$)" icone="fa-cart-shopping">
              <InputMoeda id="wUsado" valor={usado} aoMudar={setUsado} />
            </Campo>
            <Campo id="wFuncao" rotulo="Função" icone="fa-toggle-on">
              <input
                id="wFuncao"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                placeholder="Ex: Débito e Crédito"
              />
            </Campo>
          </div>
          <div className="field-row">
            <Campo id="wFecha" rotulo="Fecha dia" icone="fa-calendar-check">
              <input
                id="wFecha"
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={fecha}
                onChange={(e) => setFecha(soDia(e.target.value))}
                placeholder="20"
              />
            </Campo>
            <Campo id="wVence" rotulo="Vence dia" icone="fa-calendar-day">
              <input
                id="wVence"
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={vence}
                onChange={(e) => setVence(soDia(e.target.value))}
                placeholder="28"
              />
            </Campo>
          </div>
        </>
      )}

      {/* Prévia da cor escolhida, para não precisar salvar só para ver. */}
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: cor ?? GRADIENTES[0][1],
          marginTop: 4,
        }}
        aria-hidden="true"
      />
    </Sheet>
  )
}
