import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { CheckCircle } from '@/ui/CheckCircle'
import { StatusBadge } from '@/ui/StatusBadge'
import { fmtMoeda, MESES } from '@/lib/formatters'
import { rotuloDaForma } from '@/lib/formas'
import { useFiltros } from '@/store/useFiltros'
import { useCarteiras } from '@/hooks/useCarteiras'
import { useCategorias } from '@/hooks/useCategorias'
import { useLancamentos, type LancamentoComBaixa } from '@/hooks/useLancamentos'
import { useFluxoDeBaixa } from '@/hooks/useFluxoDeBaixa'

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Agenda() {
  const mes = useFiltros((e) => e.mes)
  const ano = useFiltros((e) => e.ano)
  const diaSelecionado = useFiltros((e) => e.diaSelecionado)
  const setDiaSelecionado = useFiltros((e) => e.setDiaSelecionado)

  const { data: lancamentos = [] } = useLancamentos(mes, ano)
  const { data: categorias = [] } = useCategorias()
  const { data: carteiras = [] } = useCarteiras()
  const { marcar, abrirValor, sheets } = useFluxoDeBaixa()

  const hoje = new Date()
  const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()

  const diaDe = (l: LancamentoComBaixa) => Number((l.data_vencimento ?? '').slice(8, 10))
  const doDia = (dia: number) => lancamentos.filter((l) => diaDe(l) === dia)

  const eventosDoDia = [...doDia(diaSelecionado)].sort(
    (a, b) => (b.valor_exibido ?? 0) - (a.valor_exibido ?? 0),
  )

  return (
    <Tela id="view-agenda">
      <div className="card">
        <TituloSecao icone="fa-calendar-days" style={{ margin: '0 0 14px' }}>
          {MESES[mes]} de {ano}
        </TituloSecao>
        <div className="cal">
          {DIAS_DA_SEMANA.map((d, i) => (
            <div className="cal-head" key={`${d}-${i}`}>
              {d}
            </div>
          ))}
          {Array.from({ length: primeiroDiaDaSemana }, (_, i) => (
            <div key={`vazio-${i}`} />
          ))}
          {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => {
            const eventos = doDia(dia)
            const ehHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
            const selecionado = dia === diaSelecionado
            return (
              <div
                key={dia}
                className={`cal-day${ehHoje ? ' today' : ''}${selecionado ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Dia ${dia}, ${eventos.length} lançamento${eventos.length === 1 ? '' : 's'}`}
                aria-pressed={selecionado}
                onClick={() => setDiaSelecionado(dia)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setDiaSelecionado(dia)
                }}
              >
                {dia}
                <span className="dots">
                  {eventos.slice(0, 3).map((l) => (
                    <i className={`dot ${l.tipo === 'receita' ? 'r' : 'd'}`} key={l.id} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div id="dayEvents">
        <TituloSecao icone="fa-calendar-day">
          Dia {String(diaSelecionado).padStart(2, '0')} de {MESES[mes]}
        </TituloSecao>
        {eventosDoDia.length === 0 ? (
          <div className="card">
            <div className="empty">Nenhum lançamento neste dia</div>
          </div>
        ) : (
          <div className="card list-card">
            {eventosDoDia.map((l) => {
              const cat = categorias.find((c) => c.id === l.categoria_id)
              const aporte = l.tipo === 'investimento'
              const receita = l.tipo === 'receita'
              const pago = l.status === 'pago'
              return (
                <div className="tx" key={l.id}>
                  <CheckCircle
                    concluido={pago}
                    rotulo={aporte ? 'aplicado' : receita ? 'recebido' : 'pago'}
                    aoClicar={(e) => {
                      e.stopPropagation()
                      marcar(l, e)
                    }}
                  />
                  <div
                    className="tx-icon"
                    style={{ background: `${cat?.cor ?? '#6a7681'}1e`, color: cat?.cor ?? '#6a7681' }}
                  >
                    <i className={`fa-solid ${cat?.icone ?? 'fa-tag'}`} aria-hidden="true" />
                  </div>
                  <div className="tx-info">
                    <b>{l.descricao}</b>
                    <span>
                      {l.pagar_a ? `${l.pagar_a} · ` : ''}
                      {rotuloDaForma(l.forma_metodo, l.forma_ref, carteiras)} · {l.dono}
                    </span>
                  </div>
                  <div className={`tx-val ${aporte ? 'inv' : receita ? 'pos' : 'neg'}`}>
                    {l.valor_exibido == null && !pago ? (
                      <b
                        className="no-price"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirValor(l)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') abrirValor(l)
                        }}
                      >
                        <i className="fa-solid fa-tag" aria-hidden="true" />
                        Adicionar valor
                      </b>
                    ) : (
                      <b>
                        {aporte ? '↗' : receita ? '+' : '−'}{' '}
                        {fmtMoeda(l.pagamento?.valor_pago ?? l.valor_exibido ?? 0)}
                      </b>
                    )}
                    <StatusBadge status={l.status!} tipo={l.tipo} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {sheets}
    </Tela>
  )
}
