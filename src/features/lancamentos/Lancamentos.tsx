import { useEffect, useMemo, useRef, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { agora, fmtMoeda } from '@/lib/formatters'
import { confetti } from '@/lib/confetti'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useFiltros } from '@/store/useFiltros'
import { useNovoLancamento } from '@/store/useNovoLancamento'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCategorias } from '@/hooks/useCategorias'
import { useInvestimentos } from '@/hooks/useInvestimentos'
import {
  useDarBaixa,
  useDesfazerBaixa,
  useExcluirLancamento,
  useLancamentos,
  type LancamentoComBaixa,
} from '@/hooks/useLancamentos'
import { LinhaLancamento } from '@/features/lancamentos/LinhaLancamento'
import { SheetLancamento } from '@/features/lancamentos/SheetLancamento'
import { SheetPagamento } from '@/features/lancamentos/SheetPagamento'
import { SheetValor } from '@/features/lancamentos/SheetValor'
import type { LancTipo } from '@/types/database'

type Filtro =
  | 'todos' | 'receita' | 'despesa' | 'investimento'
  | 'fixa' | 'parcelada' | 'pendente' | 'pago'

const FILTROS: { id: Filtro; rotulo: string; icone: string }[] = [
  { id: 'todos', rotulo: 'Todos', icone: 'fa-list' },
  { id: 'receita', rotulo: 'Receitas', icone: 'fa-arrow-trend-up' },
  { id: 'despesa', rotulo: 'Despesas', icone: 'fa-arrow-trend-down' },
  { id: 'investimento', rotulo: 'Aportes', icone: 'fa-seedling' },
  { id: 'fixa', rotulo: 'Fixas', icone: 'fa-repeat' },
  { id: 'parcelada', rotulo: 'Parcelas', icone: 'fa-credit-card' },
  { id: 'pendente', rotulo: 'Pendentes', icone: 'fa-hourglass-half' },
  { id: 'pago', rotulo: 'Concluídos', icone: 'fa-circle-check' },
]

export default function Lancamentos() {
  const mes = useFiltros((e) => e.mes)
  const ano = useFiltros((e) => e.ano)
  const { data: lancamentos = [], isLoading } = useLancamentos(mes, ano)
  const { data: categorias = [] } = useCategorias()
  const { data: carteiras = [] } = useCarteiras()
  const { data: investimentos = [] } = useInvestimentos()

  const darBaixa = useDarBaixa()
  const desfazer = useDesfazerBaixa()
  const excluir = useExcluirLancamento()

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sheetAberto, setSheetAberto] = useState(false)
  const [pagamentoAberto, setPagamentoAberto] = useState(false)
  const [valorAberto, setValorAberto] = useState(false)
  const [emFoco, setEmFoco] = useState<LancamentoComBaixa | null>(null)
  const [tipoNovo] = useState<LancTipo>('despesa')
  const [recemPago, setRecemPago] = useState<string | null>(null)
  const [momento, setMomento] = useState(agora())

  // O FAB do shell pede um lançamento novo incrementando este contador.
  const pedido = useNovoLancamento((e) => e.pedido)
  const ultimoPedido = useRef(pedido)
  useEffect(() => {
    if (pedido === ultimoPedido.current) return
    ultimoPedido.current = pedido
    setEmFoco(null)
    setSheetAberto(true)
  }, [pedido])

  const categoriaDe = (l: LancamentoComBaixa) => categorias.find((c) => c.id === l.categoria_id)
  const investimentoDe = (l: LancamentoComBaixa) =>
    investimentos.find((i) => i.id === l.investimento_id)

  const filtrados = useMemo(() => {
    let lista = lancamentos
    if (filtro === 'receita' || filtro === 'despesa' || filtro === 'investimento') {
      lista = lista.filter((l) => l.tipo === filtro)
    }
    if (filtro === 'fixa') lista = lista.filter((l) => l.natureza === 'fixa')
    if (filtro === 'parcelada') lista = lista.filter((l) => l.natureza === 'parcelada')
    if (filtro === 'pendente') lista = lista.filter((l) => l.status !== 'pago')
    if (filtro === 'pago') lista = lista.filter((l) => l.status === 'pago')
    return lista
  }, [lancamentos, filtro])

  const grupos = useMemo(() => {
    if (filtro !== 'todos') return null
    const soma = (arr: LancamentoComBaixa[]) =>
      arr.reduce((s, l) => s + (l.pagamento?.valor_pago ?? l.valor_exibido ?? 0), 0)
    return [
      { titulo: 'A pagar', icone: 'fa-arrow-up-from-bracket', itens: filtrados.filter((l) => l.tipo === 'despesa' && l.status !== 'pago') },
      { titulo: 'A receber', icone: 'fa-hand-holding-dollar', itens: filtrados.filter((l) => l.tipo === 'receita' && l.status !== 'pago') },
      { titulo: 'A investir', icone: 'fa-seedling', itens: filtrados.filter((l) => l.tipo === 'investimento' && l.status !== 'pago') },
      { titulo: 'Concluídos', icone: 'fa-circle-check', itens: filtrados.filter((l) => l.status === 'pago') },
    ]
      .filter((g) => g.itens.length > 0)
      .map((g) => ({ ...g, total: soma(g.itens) }))
  }, [filtrados, filtro])

  /**
   * Regra do check: a data e a hora são as do clique, sempre. Valor fixo já
   * definido conclui num toque só. Valor variável ou sem valor abre o sheet
   * com esse mesmo instante já preenchido.
   */
  const aoMarcar = async (l: LancamentoComBaixa, evento: React.MouseEvent<HTMLButtonElement>) => {
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

    const conclusaoDireta = l.tipo_valor === 'fixo' && l.valor_exibido != null
    if (!conclusaoDireta) {
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
        valorPago: l.valor_exibido!,
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

  const aoExcluir = async (l: LancamentoComBaixa) => {
    try {
      await excluir.mutateAsync(l.id!)
      toast(`${l.descricao} excluída`, 'fa-trash')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const abrirEdicao = (l: LancamentoComBaixa) => {
    setEmFoco(l)
    setSheetAberto(true)
  }

  const abrirValor = (l: LancamentoComBaixa) => {
    setEmFoco(l)
    setValorAberto(true)
  }

  const linha = (l: LancamentoComBaixa, i: number) => (
    <LinhaLancamento
      key={l.id}
      lancamento={l}
      indice={i}
      categoria={categoriaDe(l)}
      carteiras={carteiras}
      investimento={investimentoDe(l)}
      destacado={recemPago === l.id}
      aoAbrir={() => abrirEdicao(l)}
      aoMarcar={(e) => aoMarcar(l, e)}
      aoExcluir={() => aoExcluir(l)}
      aoAdicionarValor={() => abrirValor(l)}
    />
  )

  return (
    <Tela id="view-tx">
      <div className="filters">
        {FILTROS.map((f) => (
          <Chip key={f.id} ativo={filtro === f.id} icone={f.icone} aoClicar={() => setFiltro(f.id)}>
            {f.rotulo}
          </Chip>
        ))}
      </div>

      <div id="txList">
        {grupos
          ? grupos.map((g) => (
              <div key={g.titulo}>
                <div className="group-head">
                  <i className={`fa-solid ${g.icone}`} aria-hidden="true" />
                  {g.titulo}
                  <span>
                    {g.itens.length} · {fmtMoeda(g.total)}
                  </span>
                </div>
                {g.itens.map(linha)}
              </div>
            ))
          : filtrados.map(linha)}

        {!isLoading && filtrados.length === 0 ? (
          <div className="empty">
            {lancamentos.length === 0
              ? 'Nenhum lançamento neste mês. Toque no botão de mais para criar o primeiro.'
              : 'Nenhum lançamento com esse filtro'}
          </div>
        ) : null}
      </div>

      <SheetLancamento
        key={`lanc-${emFoco?.id ?? 'novo'}-${sheetAberto}`}
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        lancamento={sheetAberto ? emFoco : null}
        tipoInicial={tipoNovo}
      />

      <SheetPagamento
        key={`pag-${emFoco?.id ?? ''}-${pagamentoAberto}`}
        aberto={pagamentoAberto}
        aoFechar={() => setPagamentoAberto(false)}
        lancamento={emFoco}
        categoria={emFoco ? categoriaDe(emFoco) : undefined}
        momentoDoClique={momento}
      />

      <SheetValor
        key={`valor-${emFoco?.id ?? ''}-${valorAberto}`}
        aberto={valorAberto}
        aoFechar={() => setValorAberto(false)}
        lancamento={emFoco}
        categoria={emFoco ? categoriaDe(emFoco) : undefined}
      />
    </Tela>
  )
}
