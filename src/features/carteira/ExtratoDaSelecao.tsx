import { useState } from 'react'
import { TituloSecao } from '@/ui/TituloSecao'
import { fmtData, fmtHora, fmtMoeda } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { useExtrato } from '@/hooks/useExtrato'
import type { Carteira } from '@/types/database'

/** Quantos movimentos aparecem antes do "mostrar mais". */
const PAGINA = 12

type Props = {
  /** As contas em foco: as do perfil escolhido, ou todas na Carteira Geral. */
  contas: Carteira[]
  rotulo: string
}

/**
 * Extrato da seleção atual, no pé da Carteira.
 *
 * Cada conta tem o seu botão de extrato na própria linha. Este aqui responde a
 * outra pergunta: o que entrou e o que saiu do conjunto que está sendo olhado,
 * seja um perfil, seja a carteira inteira. Por isso cada movimento diz de qual
 * conta veio.
 *
 * Cartão não entra. Compra no crédito não tira dinheiro de conta nenhuma: quem
 * paga é a fatura, e ela aparece aqui no dia em que for paga.
 */
export function ExtratoDaSelecao({ contas, rotulo }: Props) {
  const [tudo, setTudo] = useState(false)
  const ids = contas.map((c) => c.id)
  const { data, isLoading, error } = useExtrato(ids.length ? ids : null)

  const nomeDaConta = (id: string) => contas.find((c) => c.id === id)
  const saldoGravado = contas.reduce((s, c) => s + c.saldo, 0)
  const confere = data ? Math.abs(data.saldo - saldoGravado) < 0.005 : true

  if (ids.length === 0) return null

  const movimentos = data?.movimentos ?? []
  const visiveis = tudo ? movimentos : movimentos.slice(0, PAGINA)

  return (
    <>
      <TituloSecao icone="fa-receipt" style={{ marginTop: 32 }}>
        Extrato {rotulo}
      </TituloSecao>

      <div className="card">
        {error ? (
          <div className="empty">{mensagemDeErro(error)}</div>
        ) : isLoading ? (
          <div className="empty">Carregando</div>
        ) : movimentos.length === 0 ? (
          <div className="empty">
            Nenhuma movimentação ainda. O dinheiro só entra ou sai quando o recebimento ou o
            pagamento é registrado.
          </div>
        ) : (
          <>
            <div className="ex-resumo">
              <div className="ex-bloco">
                <span>Entradas</span>
                <b style={{ color: 'var(--income)' }}>{fmtMoeda(data!.entradas)}</b>
              </div>
              <div className="ex-bloco">
                <span>Saídas</span>
                <b style={{ color: 'var(--expense)' }}>{fmtMoeda(data!.saidas)}</b>
              </div>
            </div>
            <div className="ex-saldo">
              <span>Saldo</span>
              <b>{fmtMoeda(data!.saldo)}</b>
            </div>

            {!confere ? (
              <div
                className="login-aviso"
                style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
              >
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <span>
                  O extrato soma {fmtMoeda(data!.saldo)}, mas as contas estão gravadas com{' '}
                  {fmtMoeda(saldoGravado)}.
                </span>
              </div>
            ) : null}

            <div className="ex-lista">
              {visiveis.map((m) => {
                const entrada = m.efeito > 0
                const conta = nomeDaConta(m.carteiraId)
                return (
                  <div key={m.id} className="ex-linha">
                    <span
                      className="ex-seta"
                      style={{
                        background: entrada ? 'var(--income-soft)' : 'var(--expense-soft)',
                        color: entrada ? 'var(--income)' : 'var(--expense)',
                      }}
                    >
                      <i
                        className={`fa-solid ${entrada ? 'fa-arrow-down' : 'fa-arrow-up'}`}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="ex-info">
                      <b>{m.descricao}</b>
                      <span>
                        {fmtData(m.data)}
                        {m.hora ? ` às ${fmtHora(m.hora)}` : ''}
                        {conta ? ` · ${conta.nome}` : ''}
                      </span>
                    </div>
                    <b
                      className="ex-valor"
                      style={{ color: entrada ? 'var(--income)' : 'var(--expense)' }}
                    >
                      {entrada ? '+' : '−'} {fmtMoeda(m.valor)}
                    </b>
                  </div>
                )
              })}
            </div>

            {movimentos.length > PAGINA ? (
              <button type="button" className="btn-sm ghost" onClick={() => setTudo((t) => !t)}>
                {tudo
                  ? 'Mostrar menos'
                  : `Mostrar os outros ${movimentos.length - PAGINA}`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
