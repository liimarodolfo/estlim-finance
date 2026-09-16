import { useEffect, useMemo, useRef, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { fmtMoeda } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useFiltros, type FiltroLista as Filtro } from '@/store/useFiltros'
import { useNovoLancamento } from '@/store/useNovoLancamento'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCategorias } from '@/hooks/useCategorias'
import { useInvestimentos } from '@/hooks/useInvestimentos'
import { useExcluirLancamento, useLancamentos, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import { useFluxoDeBaixa } from '@/hooks/useFluxoDeBaixa'
import { LinhaLancamento } from '@/features/lancamentos/LinhaLancamento'
import { SheetLancamento } from '@/features/lancamentos/SheetLancamento'
import type { LancTipo } from '@/types/database'

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
  const idEmFoco = useFiltros((e) => e.idEmFoco)
  const limparFoco = useFiltros((e) => e.limparFoco)
  const filtro = useFiltros((e) => e.filtro)
  const setFiltro = useFiltros((e) => e.setFiltro)
  const { data: lancamentos = [], isLoading } = useLancamentos(mes, ano)
  const { data: categorias = [] } = useCategorias()
  const { data: carteiras = [] } = useCarteiras()
  const { data: investimentos = [] } = useInvestimentos()

  const excluir = useExcluirLancamento()
  const { marcar, abrirValor, recemPago, sheets } = useFluxoDeBaixa()

  const [sheetAberto, setSheetAberto] = useState(false)
  const [emFoco, setEmFoco] = useState<LancamentoComBaixa | null>(null)
  const [tipoNovo] = useState<LancTipo>('despesa')

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
      arr.reduce((s, l) => s + (l.valor_realizado ?? l.valor_exibido ?? 0), 0)
    // A fatura soma pelo que sai da conta, e por isso vive num grupo só dela.
    // Se ficasse junto das outras, o subtotal contaria duas vezes o que já está
    // dentro dela: a compra no crédito aparece na própria linha e de novo no
    // valor da fatura.
    const somaCaixa = (arr: LancamentoComBaixa[]) =>
      arr.reduce((s, l) => s + (l.valor_caixa ?? 0), 0)
    const ehFatura = (l: LancamentoComBaixa) => l.cartao_id !== null
    const semFatura = filtrados.filter((l) => !ehFatura(l))

    return [
      { titulo: 'Faturas do cartão', icone: 'fa-credit-card', itens: filtrados.filter(ehFatura), caixa: true },
      { titulo: 'A pagar', icone: 'fa-arrow-up-from-bracket', itens: semFatura.filter((l) => l.tipo === 'despesa' && l.status !== 'pago'), caixa: false },
      { titulo: 'A receber', icone: 'fa-hand-holding-dollar', itens: semFatura.filter((l) => l.tipo === 'receita' && l.status !== 'pago'), caixa: false },
      { titulo: 'A investir', icone: 'fa-seedling', itens: semFatura.filter((l) => l.tipo === 'investimento' && l.status !== 'pago'), caixa: false },
      // Concluídos era um grupo só, e o subtotal somava receita com despesa: um
      // número que não queria dizer nada. Separado por tipo, cada total responde
      // uma pergunta: quanto saiu, quanto entrou, quanto foi aplicado.
      { titulo: 'Pagos', icone: 'fa-circle-check', itens: semFatura.filter((l) => l.tipo === 'despesa' && l.status === 'pago'), caixa: false },
      { titulo: 'Recebidos', icone: 'fa-sack-dollar', itens: semFatura.filter((l) => l.tipo === 'receita' && l.status === 'pago'), caixa: false },
      { titulo: 'Aplicados', icone: 'fa-seedling', itens: semFatura.filter((l) => l.tipo === 'investimento' && l.status === 'pago'), caixa: false },
    ]
      .filter((g) => g.itens.length > 0)
      .map((g) => ({ ...g, total: g.caixa ? somaCaixa(g.itens) : soma(g.itens) }))
  }, [filtrados, filtro])

  // A busca ja chegou aqui com o filtro em Todos, senao a linha achada podia
  // estar fora do recorte em uso. Aqui so falta rolar ate ela e apagar o
  // destaque depois do flash.
  useEffect(() => {
    if (!idEmFoco) return
    const achar = window.setTimeout(() => {
      document
        .querySelector(`[data-lanc="${idEmFoco}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    const apagar = window.setTimeout(limparFoco, 2000)
    return () => {
      window.clearTimeout(achar)
      window.clearTimeout(apagar)
    }
  }, [idEmFoco, limparFoco])

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

  const linha = (l: LancamentoComBaixa, i: number) => (
    <LinhaLancamento
      key={l.id}
      lancamento={l}
      indice={i}
      categoria={categoriaDe(l)}
      carteiras={carteiras}
      investimento={investimentoDe(l)}
      destacado={recemPago === l.id || idEmFoco === l.id}
      aoAbrir={() => abrirEdicao(l)}
      aoMarcar={(e) => marcar(l, e)}
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

      {sheets}
    </Tela>
  )
}
