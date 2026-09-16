import { useMemo, useState } from 'react'
import { contarAtivos, ORDENS, refinoVazio, type Ordem, type Refino } from '@/features/lancamentos/refino'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'
import type { Categoria } from '@/types/database'

type Props = {
  valor: Refino
  aoMudar: (r: Refino) => void
  categorias: Categoria[]
  /** O mês inteiro, antes de qualquer filtro: é dele que saem os nomes. */
  lancamentos: LancamentoComBaixa[]
}

/**
 * Refino da lista do mês, entre os chips e o primeiro grupo.
 *
 * Nasce recolhido mostrando só a busca, que é o que se usa toda hora. Os quatro
 * seletores ficam atrás do botão, senão o painel empurraria a lista para fora
 * da tela no celular toda vez que alguém abrisse Lançamentos.
 */
export function PainelFiltros({ valor, aoMudar, categorias, lancamentos }: Props) {
  const [aberto, setAberto] = useState(false)
  const ativos = contarAtivos(valor)

  const trocar = (parte: Partial<Refino>) => aoMudar({ ...valor, ...parte })

  // Os nomes saem do próprio mês, então toda opção oferecida devolve alguma
  // linha. O que já está escolhido entra na lista mesmo se sumir do mês, senão
  // o seletor ficaria em branco depois de trocar de mês, escondendo um filtro
  // que continua valendo.
  const nomes = (tipo: 'receita' | 'despesa', escolhido: string) => {
    const achados = new Set(
      lancamentos
        .filter((l) => l.tipo === tipo && l.pagar_a)
        .map((l) => l.pagar_a as string),
    )
    if (escolhido) achados.add(escolhido)
    return [...achados].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }

  const deQuemRecebe = useMemo(
    () => nomes('receita', valor.recebeuDe),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lancamentos, valor.recebeuDe],
  )
  const aQuemPaga = useMemo(
    () => nomes('despesa', valor.pagouPara),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lancamentos, valor.pagouPara],
  )

  const ordenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [categorias],
  )

  return (
    <div className="painel-filtros">
      <div className="pf-linha">
        <div className="pf-busca">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="text"
            autoComplete="off"
            placeholder="Buscar neste mês"
            aria-label="Buscar lançamento neste mês"
            value={valor.busca}
            onChange={(e) => trocar({ busca: e.target.value })}
          />
          {valor.busca ? (
            <button
              type="button"
              className="pf-limpar-busca"
              title="Limpar busca"
              aria-label="Limpar busca"
              onClick={() => trocar({ busca: '' })}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={`pf-botao${aberto ? ' ativo' : ''}`}
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
        >
          <i className="fa-solid fa-sliders" aria-hidden="true" />
          Filtros
          {ativos > 0 ? <span className="pf-conta">{ativos}</span> : null}
        </button>
      </div>

      {aberto ? (
        <div className="pf-corpo">
          <div className="field-row">
            <div className="field">
              <label htmlFor="pf-categoria">Tipo (categoria)</label>
              <select
                id="pf-categoria"
                value={valor.categoria}
                onChange={(e) => trocar({ categoria: e.target.value })}
              >
                <option value="">Todas</option>
                {ordenadas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="pf-ordem">Ordenar por</label>
              <select
                id="pf-ordem"
                value={valor.ordem}
                onChange={(e) => trocar({ ordem: e.target.value as Ordem })}
              >
                {ORDENS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="pf-recebeu">Recebeu de</label>
              <select
                id="pf-recebeu"
                value={valor.recebeuDe}
                onChange={(e) => trocar({ recebeuDe: e.target.value })}
                disabled={deQuemRecebe.length === 0}
              >
                <option value="">{deQuemRecebe.length ? 'Todos' : 'Nenhuma receita no mês'}</option>
                {deQuemRecebe.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="pf-pagou">Pagou para</label>
              <select
                id="pf-pagou"
                value={valor.pagouPara}
                onChange={(e) => trocar({ pagouPara: e.target.value })}
                disabled={aQuemPaga.length === 0}
              >
                <option value="">{aQuemPaga.length ? 'Todos' : 'Nenhuma despesa no mês'}</option>
                {aQuemPaga.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ativos > 0 ? (
            <button type="button" className="pf-limpar" onClick={() => aoMudar(refinoVazio)}>
              <i className="fa-solid fa-eraser" aria-hidden="true" />
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
