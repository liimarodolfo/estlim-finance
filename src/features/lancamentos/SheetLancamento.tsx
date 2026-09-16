import { useRef, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputData } from '@/ui/InputData'
import { InputHora } from '@/ui/InputHora'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { CheckCircle } from '@/ui/CheckCircle'
import { agora, fmtData, fmtHora, MESES, paraISO } from '@/lib/formatters'
import { METODO_ICONE, fontesPara, metodosPara, rotuloDaFonte } from '@/lib/formas'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCategorias } from '@/hooks/useCategorias'
import { useInvestimentos } from '@/hooks/useInvestimentos'
import { abrirComprovante, apagarComprovante, useEnviarComprovante } from '@/hooks/useComprovante'
import {
  useAtualizarLancamento,
  useCorrigirBaixa,
  useCriarLancamento,
  useExcluirLancamento,
  type LancamentoComBaixa,
} from '@/hooks/useLancamentos'
import type { Dono, LancTipo, MetodoPagamento, Natureza, TipoValor } from '@/types/database'

const DONOS: Dono[] = ['Rodolfo', 'Thainy', 'RLiima']

// Duas categorias nunca sao escolhidas a mao: Investimentos, porque o aporte
// tem o campo de destino, e Ajuste de saldo, que so o fluxo de ajuste preenche.
// O resto e filtrado pelo tipo da propria categoria.
const SO_DO_SISTEMA = ['Investimentos', 'Ajuste de saldo']

type Props = {
  aberto: boolean
  aoFechar: () => void
  lancamento: LancamentoComBaixa | null
  tipoInicial: LancTipo
}

export function SheetLancamento({ aberto, aoFechar, lancamento, tipoInicial }: Props) {
  const editando = lancamento !== null
  const { data: carteiras = [] } = useCarteiras()
  const { data: categorias = [] } = useCategorias()
  const { data: investimentos = [] } = useInvestimentos()
  const criar = useCriarLancamento()
  const atualizar = useAtualizarLancamento()
  const excluir = useExcluirLancamento()
  const corrigirBaixa = useCorrigirBaixa()
  const enviarComprovante = useEnviarComprovante()
  const arquivoRef = useRef<HTMLInputElement>(null)

  // Fatura automática não troca de tipo nem de vínculo: quem manda nela é o cartão.
  const ehFatura = Boolean(lancamento?.cartao_id)

  const [tipo, setTipo] = useState<LancTipo>(lancamento?.tipo ?? tipoInicial)
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [pagarA, setPagarA] = useState(lancamento?.pagar_a ?? '')
  const [natureza, setNatureza] = useState<Natureza>(lancamento?.natureza ?? 'avulsa')
  const [tipoValor, setTipoValor] = useState<TipoValor>(lancamento?.tipo_valor ?? 'fixo')
  // Na fatura o valor previsto fica nulo de propósito: quem manda é o usado do
  // cartão. Mostrar o de caixa deixa o campo honesto, e o aviso logo acima já
  // explica que ele não se edita aqui.
  const [valor, setValor] = useState<number | null>(
    (lancamento?.cartao_id ? lancamento.valor_caixa : lancamento?.valor_previsto) ?? null,
  )
  const [parcelas, setParcelas] = useState(String(lancamento?.parcela_total ?? ''))
  const [emissao, setEmissao] = useState(fmtData(lancamento?.data_emissao ?? null))
  const [vencimento, setVencimento] = useState(fmtData(lancamento?.data_vencimento ?? null))
  const [dataPaga, setDataPaga] = useState(fmtData(lancamento?.pagamento?.data_pagamento ?? null))
  const [horaPaga, setHoraPaga] = useState(fmtHora(lancamento?.pagamento?.hora_pagamento ?? null))
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoria_id ?? '')
  const [investimentoId, setInvestimentoId] = useState(lancamento?.investimento_id ?? '')
  const [metodo, setMetodo] = useState<MetodoPagamento>(
    lancamento?.forma_metodo ?? (tipoInicial === 'receita' ? 'pix' : 'pix'),
  )
  const [fonte, setFonte] = useState(lancamento?.forma_ref ?? '')
  const [dono, setDono] = useState<Dono>(lancamento?.dono ?? 'Rodolfo')
  const [observacoes, setObservacoes] = useState(lancamento?.observacoes ?? '')
  const [comprovante, setComprovante] = useState(lancamento?.comprovante_url ?? null)
  // O anexo que ja estava salvo. Serve para saber o que pode sumir do bucket
  // sem risco: o que foi enviado agora e ainda nao pertence a lancamento nenhum.
  const comprovanteSalvo = lancamento?.comprovante_url ?? null
  const [nomeAnexo, setNomeAnexo] = useState('')
  // No cadastro, o check diz que a conta ja foi paga ou recebida. A data e a
  // hora nascem no agora e continuam editaveis, porque o lancamento pode estar
  // sendo registrado depois do fato.
  const [marcarPago, setMarcarPago] = useState(false)

  const jaPago = lancamento?.status === 'pago' && lancamento.pagamento !== null
  const aporte = tipo === 'investimento'
  const parcelada = natureza === 'parcelada'
  const rotuloBaixa = aporte ? 'aplicado' : tipo === 'receita' ? 'recebida' : 'paga'
  // No crédito a baixa não é escolha: quem quitou a compra foi a operadora, e a
  // dívida migrou para a fatura. O banco cuida disso por gatilho.
  const noCredito = metodo === 'credito' && !ehFatura

  const metodosDisponiveis = metodosPara(tipo)
  const fontes = fontesPara(metodo, carteiras)

  const categoriasDisponiveis = categorias.filter(
    (c) => !SO_DO_SISTEMA.includes(c.nome) && (c.tipo === 'ambas' || c.tipo === tipo),
  )
  // Sem escolha explicita, cai na primeira da lista, nunca numa do sistema.
  const categoriaEscolhida =
    categoriasDisponiveis.find((c) => c.id === categoriaId)?.id ?? categoriasDisponiveis[0]?.id ?? ''

  const trocarTipo = (novo: LancTipo) => {
    if (ehFatura) return
    setTipo(novo)
    const permitidos = metodosPara(novo).map(([m]) => m)
    if (!permitidos.includes(metodo)) {
      setMetodo(permitidos[0])
      setFonte('')
    }
  }

  const trocarMetodo = (novo: MetodoPagamento) => {
    setMetodo(novo)
    setFonte('')
  }

  const alternarPago = () => {
    const ligando = !marcarPago
    setMarcarPago(ligando)
    // Ao ligar sem data preenchida, cai no agora. O que ja foi digitado fica.
    if (ligando && !dataPaga) {
      const { dataBR, hora } = agora()
      setDataPaga(dataBR)
      setHoraPaga(hora)
    }
  }

  const escolherArquivo = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    try {
      const caminho = await enviarComprovante.mutateAsync(arquivo)
      setComprovante(caminho)
      setNomeAnexo(arquivo.name)
      toast('Comprovante anexado', 'fa-paperclip')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const removerComprovante = async () => {
    const caminho = comprovante
    setComprovante(null)
    setNomeAnexo('')
    // Arquivo enviado nesta sessao e ninguem aponta para ele: sai do bucket.
    // O que ja estava salvo so some quando o lançamento for gravado sem ele.
    if (caminho && caminho !== comprovanteSalvo) await apagarComprovante(caminho)
  }

  const verComprovante = async () => {
    if (!comprovante) return
    try {
      await abrirComprovante(comprovante)
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoSalvar = async () => {
    if (!descricao.trim()) {
      toast('Informe a descrição', 'fa-triangle-exclamation')
      return
    }
    const vencISO = paraISO(vencimento)
    if (!vencISO) {
      toast('Informe a data de vencimento no formato DD/MM/AAAA', 'fa-triangle-exclamation')
      return
    }
    if (emissao && !paraISO(emissao)) {
      toast('A data de emissão está incompleta', 'fa-triangle-exclamation')
      return
    }
    // Valor só pode faltar quando o lançamento é de valor variável.
    if (tipoValor === 'fixo' && (valor == null || valor <= 0)) {
      toast('Informe o valor, ou marque o lançamento como variável', 'fa-triangle-exclamation')
      return
    }
    if (parcelada && (!parcelas || Number(parcelas) < 2)) {
      toast('Parcelada precisa de pelo menos 2 parcelas', 'fa-triangle-exclamation')
      return
    }
    if (aporte && !investimentoId && investimentos.length > 0) {
      toast('Escolha o investimento de destino', 'fa-triangle-exclamation')
      return
    }
    if (aporte && investimentos.length === 0) {
      toast('Cadastre um investimento antes de lançar um aporte', 'fa-triangle-exclamation')
      return
    }
    if (!noCredito && (marcarPago || jaPago)) {
      if (!paraISO(dataPaga)) {
        toast('Informe a data do pagamento no formato DD/MM/AAAA', 'fa-triangle-exclamation')
        return
      }
      if (!/^\d{2}:\d{2}$/.test(horaPaga)) {
        toast('Informe a hora do pagamento no formato HH:MM', 'fa-triangle-exclamation')
        return
      }
      if (valor == null || valor <= 0) {
        toast('Informe o valor para marcar como já pago', 'fa-triangle-exclamation')
        return
      }
    }

    const fonteEscolhida = fonte || fontes[0]?.[0] || null

    const dados = {
      tipo,
      descricao: descricao.trim(),
      pagar_a: pagarA.trim() || null,
      natureza,
      tipo_valor: tipoValor,
      valor_previsto: valor,
      data_emissao: emissao ? paraISO(emissao) : null,
      data_vencimento: vencISO,
      categoria_id: aporte ? null : categoriaEscolhida || null,
      forma_metodo: metodo,
      forma_ref: fonteEscolhida,
      dono,
      investimento_id: aporte ? investimentoId || investimentos[0]?.id || null : null,
      observacoes: observacoes.trim() || null,
      comprovante_url: comprovante,
    }

    try {
      if (editando) {
        await atualizar.mutateAsync({ id: lancamento.id!, dados })
        // A data e a hora da baixa aparecem editáveis na tela, então precisam
        // valer de verdade quando mudam.
        if (jaPago) {
          const baixa = lancamento.pagamento!
          const novaData = paraISO(dataPaga)!
          const novaHora = `${horaPaga}:00`
          if (novaData !== baixa.data_pagamento || novaHora !== baixa.hora_pagamento) {
            await corrigirBaixa.mutateAsync({
              lancamentoId: lancamento.id!,
              dataPagamento: novaData,
              horaPagamento: novaHora,
            })
          }
        }
        if (comprovanteSalvo && comprovanteSalvo !== comprovante) {
          await apagarComprovante(comprovanteSalvo)
        }
        toast('Lançamento atualizado', 'fa-pen')
      } else {
        const vencEscolhido = await criar.mutateAsync({
          ...dados,
          parcelas: parcelada ? Number(parcelas) : 1,
          pago: marcarPago && !noCredito,
          pago_data: marcarPago && !noCredito ? paraISO(dataPaga) : null,
          pago_hora: marcarPago && !noCredito ? `${horaPaga}:00` : null,
        })
        // No crédito o banco pode ter mandado a compra para outra fatura.
        const naFatura =
          noCredito && vencEscolhido
            ? ` de ${MESES[new Date(`${vencEscolhido}T12:00:00`).getMonth()]}/${vencEscolhido.slice(0, 4)}`
            : ''
        toast(
          parcelada
            ? `${parcelas} parcelas criadas, uma por mês${noCredito ? `, a primeira na fatura${naFatura}` : marcarPago ? `, a primeira já ${rotuloBaixa}` : ''}`
            : noCredito
              ? `Lançamento criado e somado à fatura${naFatura}`
              : marcarPago
                ? `Lançamento criado e marcado como ${rotuloBaixa}`
                : 'Lançamento criado',
          parcelada ? 'fa-layer-group' : noCredito ? 'fa-credit-card' : 'fa-circle-check',
        )
      }
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoExcluir = async () => {
    if (!lancamento?.id) return
    try {
      await excluir.mutateAsync(lancamento.id)
      toast(`${lancamento.descricao} excluída`, 'fa-trash')
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
      icone={aporte ? 'fa-seedling' : tipo === 'receita' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}
      acoes={
        <div className="sheet-actions">
          <BotaoPill
            icone="fa-check"
            aoClicar={aoSalvar}
            ocupado={criar.isPending || atualizar.isPending || corrigirBaixa.isPending}
          >
            Salvar lançamento
          </BotaoPill>
          {editando ? <BotaoExcluir aoClicar={aoExcluir} titulo="Excluir lançamento" /> : null}
        </div>
      }
    >
      <div className="seg">
        <button
          type="button"
          className={tipo === 'despesa' ? 'active despesa' : ''}
          onClick={() => trocarTipo('despesa')}
          disabled={ehFatura}
        >
          <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
          Despesa
        </button>
        <button
          type="button"
          className={tipo === 'receita' ? 'active receita' : ''}
          onClick={() => trocarTipo('receita')}
          disabled={ehFatura}
        >
          <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
          Receita
        </button>
        <button
          type="button"
          className={tipo === 'investimento' ? 'active investimento' : ''}
          onClick={() => trocarTipo('investimento')}
          disabled={ehFatura}
        >
          <i className="fa-solid fa-seedling" aria-hidden="true" />
          Investir
        </button>
      </div>

      {ehFatura ? (
        <div className="login-aviso" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
          <i className="fa-solid fa-credit-card" aria-hidden="true" />
          <span>
            Fatura automática. O valor acompanha o limite utilizado do cartão e o dia vem do
            vencimento dele, então esses dois não se editam aqui.
          </span>
        </div>
      ) : null}

      <Campo id="fDesc" rotulo="Descrição" icone="fa-file-lines">
        <input
          id="fDesc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Conta de energia"
        />
      </Campo>

      <Campo
        id="fPagarA"
        rotulo={aporte ? 'Aplicar onde' : tipo === 'receita' ? 'Receber de quem' : 'Pagar a quem'}
        icone="fa-user"
      >
        <input
          id="fPagarA"
          value={pagarA}
          onChange={(e) => setPagarA(e.target.value)}
          placeholder="Ex: Enel, Imobiliária, Vivo"
        />
      </Campo>

      <div className="field-row">
        <Campo id="fNatureza" rotulo="Tipo de conta" icone="fa-repeat">
          <select
            id="fNatureza"
            value={natureza}
            onChange={(e) => setNatureza(e.target.value as Natureza)}
            disabled={editando}
          >
            <option value="fixa">Fixa mensal</option>
            <option value="avulsa">Avulsa</option>
            <option value="parcelada">Parcelada</option>
          </select>
        </Campo>
        <Campo id="fValorTipo" rotulo="Valor" icone="fa-sliders">
          <select
            id="fValorTipo"
            value={tipoValor}
            onChange={(e) => setTipoValor(e.target.value as TipoValor)}
          >
            <option value="fixo">Fixo</option>
            <option value="variavel">Variável</option>
          </select>
        </Campo>
      </div>

      {parcelada && !editando ? (
        <div className="field-row">
          <Campo id="fValParc" rotulo="Valor da parcela (R$)" icone="fa-brazilian-real-sign">
            <InputMoeda id="fValParc" valor={valor} aoMudar={setValor} />
          </Campo>
          <Campo id="fNumParc" rotulo="Nº de parcelas" icone="fa-hashtag">
            <input
              id="fNumParc"
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Ex: 12"
            />
          </Campo>
        </div>
      ) : (
        <Campo
          id="fVal"
          rotulo={tipoValor === 'variavel' ? 'Valor previsto (R$)' : 'Valor (R$)'}
          icone="fa-brazilian-real-sign"
        >
          <InputMoeda
            id="fVal"
            valor={valor}
            aoMudar={setValor}
            placeholder={tipoValor === 'variavel' ? 'Pode deixar vazio' : '0,00'}
          />
        </Campo>
      )}

      <div className="field-row">
        <Campo id="fEmissao" rotulo="Data de emissão" icone="fa-file-invoice">
          <InputData id="fEmissao" valor={emissao} aoMudar={setEmissao} />
        </Campo>
        <Campo id="fVenc" rotulo="Data de vencimento" icone="fa-calendar-day">
          <InputData id="fVenc" valor={vencimento} aoMudar={setVencimento} />
        </Campo>
      </div>

      {noCredito ? (
        <div className="check-linha">
          <CheckCircle concluido rotulo="paga" desabilitado aoClicar={() => {}} />
          <div>
            <b>Já entra como paga</b>
            <span>
              No crédito quem quitou a compra foi a operadora. A dívida vai para a fatura do cartão,
              que é paga depois, então nenhuma conta se move agora.
            </span>
          </div>
        </div>
      ) : !editando ? (
        <div
          className="check-linha"
          role="button"
          tabIndex={0}
          onClick={alternarPago}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              alternarPago()
            }
          }}
        >
          <CheckCircle
            concluido={marcarPago}
            rotulo={rotuloBaixa}
            aoClicar={(e) => {
              e.stopPropagation()
              alternarPago()
            }}
          />
          <div>
            <b>Já foi {rotuloBaixa}</b>
            <span>
              {marcarPago
                ? 'A data e a hora abaixo vão para o registro da baixa'
                : `Marque para registrar o lançamento já ${rotuloBaixa}`}
            </span>
          </div>
        </div>
      ) : null}

      {!noCredito && (jaPago || marcarPago) ? (
        <div className="field-row">
          <Campo
            id="fPagoData"
            rotulo={aporte ? 'Data do aporte' : tipo === 'receita' ? 'Data recebido' : 'Data pago'}
            icone="fa-circle-check"
          >
            <InputData id="fPagoData" valor={dataPaga} aoMudar={setDataPaga} />
          </Campo>
          <Campo id="fPagoHora" rotulo="Hora (24h)" icone="fa-clock">
            <InputHora id="fPagoHora" valor={horaPaga} aoMudar={setHoraPaga} />
          </Campo>
        </div>
      ) : null}

      {aporte ? (
        <Campo id="fInvDestino" rotulo="Investimento de destino" icone="fa-seedling">
          <select
            id="fInvDestino"
            value={investimentoId}
            onChange={(e) => setInvestimentoId(e.target.value)}
          >
            {investimentos.length === 0 ? (
              <option value="">Cadastre um investimento primeiro</option>
            ) : (
              investimentos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sub === 'ativo' ? 'Ativo' : 'Caixinha'} · {i.nome}
                </option>
              ))
            )}
          </select>
        </Campo>
      ) : (
        <Campo id="fCat" rotulo="Categoria" icone="fa-tags">
          <select
            id="fCat"
            value={categoriaEscolhida}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            {categoriasDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <div className="field-row">
        <Campo id="fMetodo" rotulo="Forma de pagamento" icone="fa-wallet">
          <select
            id="fMetodo"
            value={metodo}
            onChange={(e) => trocarMetodo(e.target.value as MetodoPagamento)}
          >
            {metodosDisponiveis.map(([valorMetodo, rotulo]) => (
              <option key={valorMetodo} value={valorMetodo}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="fFonte" rotulo={rotuloDaFonte(metodo)} icone={METODO_ICONE[metodo]}>
          <select id="fFonte" value={fonte} onChange={(e) => setFonte(e.target.value)}>
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

      <Campo id="fDono" rotulo="Responsável" icone="fa-user-group">
        <select id="fDono" value={dono} onChange={(e) => setDono(e.target.value as Dono)}>
          {DONOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="fObs" rotulo="Observações" icone="fa-align-left">
        <textarea
          id="fObs"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Anotação livre sobre este lançamento"
        />
      </Campo>

      <Campo rotulo="Comprovante" icone="fa-paperclip">
        <div className={`anexo-box${comprovante ? ' tem' : ''}`}>
          <i
            className={`fa-solid ${comprovante ? 'fa-file-circle-check' : 'fa-paperclip'}`}
            aria-hidden="true"
          />
          <span className="anexo-nome">
            {enviarComprovante.isPending
              ? 'Enviando...'
              : comprovante
                ? nomeAnexo || 'Comprovante anexado'
                : 'Nenhum arquivo anexado'}
          </span>
          {comprovante ? (
            <>
              <button type="button" className="mini-btn" title="Ver comprovante" onClick={verComprovante}>
                <i className="fa-solid fa-eye" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="mini-btn"
                title="Remover comprovante"
                onClick={removerComprovante}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mini-btn"
              title="Anexar comprovante"
              onClick={() => arquivoRef.current?.click()}
              disabled={enviarComprovante.isPending}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
          )}
        </div>
        <input
          ref={arquivoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          hidden
          onChange={escolherArquivo}
        />
      </Campo>

      {parcelada && !editando && metodo === 'credito' ? (
        <div className="bl-formula">
          No crédito, o dia de vencimento de cada parcela vem do cartão escolhido, não da data
          digitada acima.
        </div>
      ) : null}
    </Sheet>
  )
}
