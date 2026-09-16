import { useMemo, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { TituloSecao } from '@/ui/TituloSecao'
import { fmtMoeda, MESES, MESES_LONGOS } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { useFiltros } from '@/store/useFiltros'
import { useCategorias } from '@/hooks/useCategorias'
import {
  somaDoPar,
  useRelatorios,
  type Base,
  type LinhaDoFluxo,
  type Modo,
  type Par,
  type Periodo,
} from '@/hooks/useRelatorios'

/** Barras do fluxo: receita e despesa lado a lado, na mesma escala. */
function Fluxo({ linhas, base }: { linhas: LinhaDoFluxo[]; base: Base }) {
  const valor = (p: Par) => somaDoPar(p, base)
  const teto = Math.max(...linhas.map((l) => Math.max(valor(l.receitas), valor(l.despesas))), 1)

  return (
    <div className="rel-fluxo">
      {linhas.map((l) => (
        <div
          key={l.rotulo}
          className="rf-col"
          title={`${l.rotulo}: entrou ${fmtMoeda(valor(l.receitas))}, saiu ${fmtMoeda(valor(l.despesas))}`}
        >
          <div className="rf-barras">
            {/* Mes sem movimento nao desenha nada: um tracinho de altura
                minima parecia dado, e nao e. */}
            <span
              className="rf-barra rf-in"
              style={{
                height: `${(valor(l.receitas) / teto) * 100}%`,
                minHeight: valor(l.receitas) > 0 ? 2 : 0,
              }}
              aria-hidden="true"
            />
            <span
              className="rf-barra rf-out"
              style={{
                height: `${(valor(l.despesas) / teto) * 100}%`,
                minHeight: valor(l.despesas) > 0 ? 2 : 0,
              }}
              aria-hidden="true"
            />
          </div>
          <span className="rf-rot">{l.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

/** O número grande é o da base escolhida, e o outro fica logo abaixo. */
function Bloco({ rotulo, par, base, cor }: { rotulo: string; par: Par; base: Base; cor: string }) {
  const principal = somaDoPar(par, base)
  const outro = base === 'real' ? par.prev : par.real
  const nomeDoOutro = base === 'real' ? 'previsto' : 'já realizado'

  return (
    <div className="rr-bloco">
      <span>{rotulo}</span>
      <b style={{ color: cor }}>{fmtMoeda(principal)}</b>
      <small>
        {nomeDoOutro} {fmtMoeda(outro)}
      </small>
    </div>
  )
}

export default function Relatorios() {
  const mesDoApp = useFiltros((e) => e.mes)
  const anoDoApp = useFiltros((e) => e.ano)
  const { data: categorias = [] } = useCategorias()

  const [modo, setModo] = useState<Modo>('mes')
  const [base, setBase] = useState<Base>('real')
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

  const v = (p: Par) => somaDoPar(p, base)

  // Ordena pela base que está sendo lida e some quem ficou em zero. Em
  // Realizado, isso é o que garante que só apareça quem de fato pagou ou
  // recebeu: quem ainda não pagou tem realizado zero e sai da lista.
  const ordenado = <T extends { total: Par }>(lista: T[]) =>
    [...lista].sort((a, b) => v(b.total) - v(a.total)).filter((x) => v(x.total) > 0.005)

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

      {/* Realizado e previsto sao perguntas diferentes, e a tela nunca soma uma
          na outra. Realizado e o que ja foi pago ou recebido; previsto e o que
          esta planejado para o periodo, tenha sido pago ou nao. */}
      <div className="filters rel-base">
        <Chip ativo={base === 'real'} icone="fa-circle-check" aoClicar={() => setBase('real')}>
          Realizado
        </Chip>
        <Chip ativo={base === 'prev'} icone="fa-calendar-check" aoClicar={() => setBase('prev')}>
          Previsto
        </Chip>
      </div>

      {error ? (
        <div className="empty">{mensagemDeErro(error)}</div>
      ) : isLoading || !data ? (
        <div className="empty">Somando</div>
      ) : data.quantidade === 0 ? (
        <div className="empty">Nenhum lançamento em {rotuloDoPeriodo}.</div>
      ) : (
        (() => {
          const entrou = v(data.receitas)
          const saiu = v(data.despesas)
          const sobra = entrou - saiu
          const aReceber = data.receitas.prev - data.receitas.real
          const aPagar = data.despesas.prev - data.despesas.real

          return (
            <>
              <TituloSecao icone="fa-scale-balanced">
                {base === 'real' ? 'O que entrou e o que saiu' : 'O que está previsto'}
              </TituloSecao>
              <div className="card">
                <div className="rel-resumo">
                  <Bloco
                    rotulo={base === 'real' ? 'Entrou' : 'Previsto entrar'}
                    par={data.receitas}
                    base={base}
                    cor="var(--income)"
                  />
                  <Bloco
                    rotulo={base === 'real' ? 'Saiu' : 'Previsto sair'}
                    par={data.despesas}
                    base={base}
                    cor="var(--expense)"
                  />
                </div>
                <div className="ex-saldo">
                  <span>{sobra >= 0 ? 'Sobrou' : 'Faltou'}</span>
                  <b style={{ color: sobra >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {fmtMoeda(Math.abs(sobra))}
                  </b>
                </div>

                {base === 'real' && (aReceber > 0.005 || aPagar > 0.005) ? (
                  <div className="rel-nota">
                    Do que estava previsto para {rotuloDoPeriodo}, ainda falta receber{' '}
                    {fmtMoeda(aReceber)} e pagar {fmtMoeda(aPagar)}. Toque em Previsto para ver o
                    planejado.
                  </div>
                ) : null}

                {data.aportes.prev > 0 || data.aportes.real > 0 ? (
                  <div className="rel-nota">
                    Fora isso, {fmtMoeda(v(data.aportes))} foram para investimento. Aporte não conta
                    como gasto: o dinheiro mudou de lugar e continua sendo de vocês.
                  </div>
                ) : null}

                {modo === 'ano' ? <Fluxo linhas={data.fluxo} base={base} /> : null}
              </div>

              <TituloSecao icone="fa-chart-pie" style={{ marginTop: 32 }}>
                {modo === 'ano' ? 'Categoria ao longo do ano' : 'Gasto por categoria'}
              </TituloSecao>
              <div className="card list-card">
                {ordenado(data.categorias).length === 0 ? (
                  <div className="empty">
                    {base === 'real'
                      ? 'Nenhuma despesa paga no período.'
                      : 'Nenhuma despesa com categoria no período.'}
                  </div>
                ) : (
                  ordenado(data.categorias).map((c) => {
                    const cat = nomeDaCategoria(c.id)
                    const cor = cat?.cor ?? '#6a7681'
                    const serie = base === 'real' ? c.porMes.real : c.porMes.prev
                    const teto = Math.max(...serie, 1)
                    const fatia = saiu > 0 ? v(c.total) / saiu : 0
                    return (
                      <div key={c.id} className="rel-cat">
                        <div className="rc-topo">
                          <span
                            className="rc-ponto"
                            style={{ background: cor }}
                            aria-hidden="true"
                          />
                          <b className="rc-nome">{cat?.nome ?? 'Sem categoria'}</b>
                          <span className="rc-fatia">{Math.round(fatia * 100)}%</span>
                          <b className="rc-total">{fmtMoeda(v(c.total))}</b>
                        </div>
                        {modo === 'ano' ? (
                          <div className="rc-serie">
                            {serie.map((valor, i) => (
                              <span
                                key={MESES[i]}
                                className="rc-mes"
                                title={`${MESES[i]}: ${fmtMoeda(valor)}`}
                              >
                                <span
                                  className="rc-mes-barra"
                                  style={{
                                    height: `${(valor / teto) * 100}%`,
                                    minHeight: valor > 0 ? 2 : 0,
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
                {data.perfis.filter((p) => v(p.receitas) > 0 || v(p.despesas) > 0 || v(p.aportes) > 0)
                  .length === 0 ? (
                  <div className="empty">Nada registrado no período.</div>
                ) : (
                  data.perfis
                    .filter((p) => v(p.receitas) > 0 || v(p.despesas) > 0 || v(p.aportes) > 0)
                    .map((p) => {
                      const saldo = v(p.receitas) - v(p.despesas)
                      return (
                        <div key={p.dono} className="rel-perfil">
                          <div className="rp-nome">
                            <b>{p.dono}</b>
                            <span>
                              {fmtMoeda(v(p.receitas))} entrou · {fmtMoeda(v(p.despesas))} saiu
                              {v(p.aportes) > 0 ? ` · ${fmtMoeda(v(p.aportes))} aplicado` : ''}
                            </span>
                          </div>
                          <b
                            className="rp-saldo"
                            style={{ color: saldo >= 0 ? 'var(--income)' : 'var(--expense)' }}
                          >
                            {saldo >= 0 ? '+' : '−'} {fmtMoeda(Math.abs(saldo))}
                          </b>
                        </div>
                      )
                    })
                )}
              </div>

              <TituloSecao icone="fa-arrow-right-arrow-left" style={{ marginTop: 32 }}>
                Para quem vai o dinheiro
              </TituloSecao>
              <div className="rel-duo">
                <div>
                  <div className="rel-subtitulo">
                    {base === 'real' ? 'Pagou para' : 'Vai pagar para'}
                  </div>
                  <div className="card list-card">
                    {ordenado(data.pagouPara).length === 0 ? (
                      <div className="empty">Nenhum pagamento registrado.</div>
                    ) : (
                      ordenado(data.pagouPara).map((n) => (
                        <div key={n.nome} className="rel-nome">
                          <div className="rn-info">
                            <b>{n.nome}</b>
                            <span>
                              {n.quantas} {n.quantas === 1 ? 'conta' : 'contas'}
                            </span>
                          </div>
                          <b style={{ color: 'var(--expense)' }}>{fmtMoeda(v(n.total))}</b>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="rel-subtitulo">
                    {base === 'real' ? 'Recebeu de' : 'Vai receber de'}
                  </div>
                  <div className="card list-card">
                    {ordenado(data.recebeuDe).length === 0 ? (
                      <div className="empty">Nenhum recebimento registrado.</div>
                    ) : (
                      ordenado(data.recebeuDe).map((n) => (
                        <div key={n.nome} className="rel-nome">
                          <div className="rn-info">
                            <b>{n.nome}</b>
                            <span>
                              {n.quantas} {n.quantas === 1 ? 'entrada' : 'entradas'}
                            </span>
                          </div>
                          <b style={{ color: 'var(--income)' }}>{fmtMoeda(v(n.total))}</b>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )
        })()
      )}
    </Tela>
  )
}
