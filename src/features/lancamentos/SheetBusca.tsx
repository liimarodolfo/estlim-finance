import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '@/ui/Sheet'
import { StatusBadge } from '@/ui/StatusBadge'
import { fmtMoeda, MESES } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { useFiltros } from '@/store/useFiltros'
import { useCategorias } from '@/hooks/useCategorias'
import { buscaMinima, buscaTeto, limparTermo, useBuscaLancamentos } from '@/hooks/useBusca'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'

type Props = {
  aberto: boolean
  aoFechar: () => void
}

/**
 * Busca de lançamentos, em todos os meses.
 *
 * O resultado não abre a edição aqui dentro: ele leva para o mês do lançamento
 * e destaca a linha. Assim quem achou continua enxergando a conta no meio das
 * outras, que é o contexto que dá sentido ao número.
 */
export function SheetBusca({ aberto, aoFechar }: Props) {
  const navigate = useNavigate()
  const irPara = useFiltros((e) => e.irPara)
  const { data: categorias = [] } = useCategorias()

  const [termo, setTermo] = useState('')
  const [atrasado, setAtrasado] = useState('')
  const campo = useRef<HTMLInputElement>(null)

  // Espera a digitação parar antes de consultar, senão cada tecla vira uma ida
  // ao banco e as respostas chegam fora de ordem.
  useEffect(() => {
    const t = window.setTimeout(() => setAtrasado(termo), 250)
    return () => window.clearTimeout(t)
  }, [termo])

  // Abrir com o campo vazio e o teclado pronto. O atraso deixa a transição do
  // sheet terminar antes, senão o iOS rola a tela para um elemento que ainda
  // está subindo.
  useEffect(() => {
    if (!aberto) return
    const t = window.setTimeout(() => campo.current?.focus(), 320)
    return () => window.clearTimeout(t)
  }, [aberto])

  const { data: achados = [], isFetching, error } = useBuscaLancamentos(atrasado)
  const limpo = limparTermo(atrasado)
  const curto = limpo.length > 0 && limpo.length < buscaMinima
  const buscou = limpo.length >= buscaMinima

  const porCategoria = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  // Limpar no proprio fechamento, e nao num efeito que observa "aberto": o
  // efeito rodaria depois da animacao de saida, e o termo antigo piscaria na
  // reabertura.
  const fechar = () => {
    setTermo('')
    setAtrasado('')
    aoFechar()
  }

  const abrir = (l: LancamentoComBaixa) => {
    if (!l.id || !l.data_vencimento) return
    const [ano, mes] = l.data_vencimento.split('-')
    irPara(Number(mes) - 1, Number(ano), l.id)
    fechar()
    navigate('/lancamentos')
  }

  const linha = (l: LancamentoComBaixa) => {
    const aporte = l.tipo === 'investimento'
    const receita = l.tipo === 'receita'
    const categoria = l.categoria_id ? porCategoria.get(l.categoria_id) : undefined
    const cor = categoria?.cor ?? '#6a7681'
    const icone = categoria?.icone ?? (aporte ? 'fa-seedling' : 'fa-tag')

    const [ano, mes] = (l.data_vencimento ?? '').split('-')
    const quando = mes ? `${MESES[Number(mes) - 1]} de ${ano}` : ''
    const valor = l.cartao_id
      ? (l.valor_caixa ?? 0)
      : (l.valor_realizado ?? l.valor_exibido ?? 0)

    return (
      <div
        key={l.id}
        className="tx busca-item"
        role="button"
        tabIndex={0}
        onClick={() => abrir(l)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') abrir(l)
        }}
      >
        <div className="tx-icon" style={{ background: `${cor}1e`, color: cor }}>
          <i className={`fa-solid ${icone}`} aria-hidden="true" />
        </div>

        <div className="tx-info">
          <b>{l.descricao}</b>
          <span>
            {quando}
            {categoria ? ` · ${categoria.nome}` : ''}
            {l.pagar_a ? ` · ${l.pagar_a}` : ''}
          </span>
        </div>

        <div className={`tx-val ${aporte ? 'inv' : receita ? 'pos' : 'neg'}`}>
          <b>
            {aporte ? '↗' : receita ? '+' : '−'} {fmtMoeda(valor)}
          </b>
          <StatusBadge status={l.status ?? 'pendente'} tipo={l.tipo} />
        </div>
      </div>
    )
  }

  return (
    <Sheet aberto={aberto} aoFechar={fechar} titulo="Buscar" icone="fa-magnifying-glass">
      <div className="field">
        <label htmlFor="busca-termo">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          Descrição ou a quem se paga
        </label>
        <input
          id="busca-termo"
          ref={campo}
          type="text"
          autoComplete="off"
          placeholder="Ex: energia, aluguel, Marcel"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
      </div>

      {error ? (
        <div className="empty">{mensagemDeErro(error)}</div>
      ) : curto ? (
        <div className="empty">Escreva pelo menos {buscaMinima} letras.</div>
      ) : !buscou ? (
        <div className="empty">A busca olha todos os meses, não só o que está na tela.</div>
      ) : isFetching && achados.length === 0 ? (
        <div className="empty">Procurando</div>
      ) : achados.length === 0 ? (
        <div className="empty">Nada encontrado para "{limpo}".</div>
      ) : (
        <>
          <div className="busca-conta">
            {achados.length === 1 ? '1 resultado' : `${achados.length} resultados`}
            {achados.length === buscaTeto ? ', os mais recentes' : ''}
          </div>
          {achados.map(linha)}
        </>
      )}
    </Sheet>
  )
}
