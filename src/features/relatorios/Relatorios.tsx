import { useMemo, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { TituloSecao } from '@/ui/TituloSecao'
import { fmtMoeda, MESES, MESES_LONGOS } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { useFiltros } from '@/store/useFiltros'
import { useCategorias } from '@/hooks/useCategorias'
import { useRelatorios, type LinhaDoFluxo, type Modo, type Periodo } from '@/hooks/useRelatorios'

/** Barras do fluxo: receita para cima, despesa para baixo, na mesma escala. */
function Fluxo({ linhas }: { linhas: LinhaDoFluxo[] }) {
  const teto = Math.max(...linhas.map((l) => Math.max(l.receitas, l.despesas)), 1)

  return (
    <div className="rel-fluxo">
      {linhas.map((l) => (
        <div key={l.rotulo} className="rf-col" title={`${l.rotulo}: entrou ${fmtMoeda(l.receitas)}, saiu ${fmtMoeda(l.despesas)}`}>
          <div className="rf-barras">
            {/* Mes sem movimento nao desenha nada: um tracinho de altura
                minima parecia dado, e nao e. */}
            <span
              className="rf-barra rf-in"
              style={{ height: `${(l.receitas / teto) * 100}%`, minHeight: l.receitas > 0 ? 2 : 0 }}
              aria-hidden="true"
            />
            <span
              className="rf-barra rf-out"
              style={{ height: `${(l.despesas / teto) * 100}%`, minHeight: l.despesas > 0 ? 2 : 0 }}
              aria-hidden="true"
            />
          </div>
          <span className="rf-rot">{l.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const mesDoApp = useFiltros((e) => e.mes)
  const anoDoApp = useFiltros((e) => e.ano)
  const { data: categorias = [] } = useCategorias()

  const [modo, setModo] = useState<Modo>('mes')
  const [ano, setAno] = useState(anoDoApp)

  const periodo: Periodo = useMemo(
    () => ({ modo, mes: mesDoApp, ano: modo === 'ano' ? ano : anoDoApp }),
    [modo, mesDoApp, ano, anoDoApp],
  )

  const { data, isLoading, error } = useRelatorios(periodo)

  const nomeDaCategoria = (id: string) => categorias.find((c) => c.id === id)
  const anos = useMemo(() => {
    const atual = new Date().getFullYear()
    return [atual - 2, atual - 1, atual, atual + 1]
  }, [])

  const rotuloDoPeriodo =
    modo === 'ano' ? String(ano) : `${MESES_LONGOS[mesDoApp]} de ${anoDoApp}`

  return (
    <Tela id="view-rel">
      <div className="filters">
        <Chip ativo={modo === 'mes'} icone="fa-calendar-day" aoClicar={() => setModo('mes')}>
          Mês atual
        </Chip>
        <Chip ativo={modo === 'ano'} icone="fa-calendar-days" aoClicar={() => setModo('ano')}>
          Ano todo
        </Chip>
        {modo === 'ano' ? (
          <select
            className="rel-ano"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label="Ano do relatório"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? (
        <div className="empty">{mensagemDeErro(error)}</div>
      ) : isLoading || !data ? (
        <div className="empty">Somando</div>
      ) : data.quantidade === 0 ? (
        <div className="empty">Nenhum lançamento em {rotuloDoPeriodo}.</div>
      ) : (
        <>
          <TituloSecao icone="fa-scale-balanced">Entradas e saídas</TituloSecao>
          <div className="card">
            <div className="rel-resumo">
              <div className="rr-bloco">
                <span>Entrou</span>
                <b style={{ color: 'var(--income)' }}>{fmtMoeda(data.receitas)}</b>
              </div>
              <div className="rr-bloco">
                <span>Saiu</span>
                <b style={{ color: 'var(--expense)' }}>{fmtMoeda(data.despesas)}</b>
              </div>
            </div>
            <div className="ex-saldo">
              <span>{data.sobra >= 0 ? 'Sobrou' : 'Faltou'}</span>
              <b style={{ color: data.sobra >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {fmtMoeda(Math.abs(data.sobra))}
              </b>
            </div>
            {data.aportes > 0 ? (
              <div className="rel-nota">
                Fora isso, {fmtMoeda(data.aportes)} foram para investimento. Aporte não conta como
                gasto: o dinheiro mudou de lugar e continua sendo de vocês.
              </div>
            ) : null}
            {modo === 'ano' ? <Fluxo linhas={data.fluxo} /> : null}
          </div>

          <TituloSecao icone="fa-chart-pie" style={{ marginTop: 32 }}>
            {modo === 'ano' ? 'Categoria ao longo do ano' : 'Gasto por categoria'}
          </TituloSecao>
          <div className="card list-card">
            {data.categorias.length === 0 ? (
              <div className="empty">Nenhuma despesa com categoria no período.</div>
            ) : (
              data.categorias.map((c) => {
                const cat = nomeDaCategoria(c.id)
                const cor = cat?.cor ?? '#6a7681'
                const teto = Math.max(...c.porMes, 1)
                return (
                  <div key={c.id} className="rel-cat">
                    <div className="rc-topo">
                      <span className="rc-ponto" style={{ background: cor }} aria-hidden="true" />
                      <b className="rc-nome">{cat?.nome ?? 'Sem categoria'}</b>
                      <span className="rc-fatia">{Math.round(c.fatia * 100)}%</span>
                      <b className="rc-total">{fmtMoeda(c.total)}</b>
                    </div>
                    {modo === 'ano' ? (
                      <div className="rc-serie">
                        {c.porMes.map((v, i) => (
                          <span
                            key={MESES[i]}
                            className="rc-mes"
                            title={`${MESES[i]}: ${fmtMoeda(v)}`}
                          >
                            <span
                              className="rc-mes-barra"
                              style={{
                                height: `${(v / teto) * 100}%`,
                                minHeight: v > 0 ? 2 : 0,
                                background: cor,
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <TituloSecao icone="fa-users" style={{ marginTop: 32 }}>
            Por pessoa e por perfil
          </TituloSecao>
          <div className="card list-card">
            {data.perfis.map((p) => (
              <div key={p.dono} className="rel-perfil">
                <div className="rp-nome">
                  <b>{p.dono}</b>
                  <span>
                    {fmtMoeda(p.receitas)} entrou · {fmtMoeda(p.despesas)} saiu
                    {p.aportes > 0 ? ` · ${fmtMoeda(p.aportes)} aplicado` : ''}
                  </span>
                </div>
                <b
                  className="rp-saldo"
                  style={{ color: p.saldo >= 0 ? 'var(--income)' : 'var(--expense)' }}
                >
                  {p.saldo >= 0 ? '+' : '−'} {fmtMoeda(Math.abs(p.saldo))}
                </b>
              </div>
            ))}
          </div>

          <TituloSecao icone="fa-arrow-right-arrow-left" style={{ marginTop: 32 }}>
            Para quem vai o dinheiro
          </TituloSecao>
          <div className="rel-duo">
            <div>
              <div className="rel-subtitulo">Pagou para</div>
              <div className="card list-card">
                {data.pagouPara.length === 0 ? (
                  <div className="empty">Ninguém registrado.</div>
                ) : (
                  data.pagouPara.map((n) => (
                    <div key={n.nome} className="rel-nome">
                      <div className="rn-info">
                        <b>{n.nome}</b>
                        <span>
                          {n.quantas} {n.quantas === 1 ? 'conta' : 'contas'}
                        </span>
                      </div>
                      <b style={{ color: 'var(--expense)' }}>{fmtMoeda(n.total)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="rel-subtitulo">Recebeu de</div>
              <div className="card list-card">
                {data.recebeuDe.length === 0 ? (
                  <div className="empty">Ninguém registrado.</div>
                ) : (
                  data.recebeuDe.map((n) => (
                    <div key={n.nome} className="rel-nome">
                      <div className="rn-info">
                        <b>{n.nome}</b>
                        <span>
                          {n.quantas} {n.quantas === 1 ? 'entrada' : 'entradas'}
                        </span>
                      </div>
                      <b style={{ color: 'var(--income)' }}>{fmtMoeda(n.total)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Tela>
  )
}
