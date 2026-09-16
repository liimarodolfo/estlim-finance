import { Sheet } from '@/ui/Sheet'
import { fmtData, fmtHora, fmtMoeda } from '@/lib/formatters'
import { mensagemDeErro } from '@/lib/erros'
import { useExtrato } from '@/hooks/useExtrato'
import type { Carteira } from '@/types/database'

type Props = {
  aberto: boolean
  aoFechar: () => void
  carteira: Carteira | null
}

/**
 * Extrato da conta: o que entrou, o que saiu, e a conta fechando no saldo.
 *
 * O rodapé compara o que o extrato soma com o saldo gravado na carteira. Eles
 * têm que bater, e quando não batem é melhor a tela dizer do que deixar o
 * usuário descobrir sozinho meses depois.
 */
export function SheetExtrato({ aberto, aoFechar, carteira }: Props) {
  const { data, isLoading, error } = useExtrato(aberto ? (carteira?.id ?? null) : null)

  const confere = data ? Math.abs(data.saldo - (carteira?.saldo ?? 0)) < 0.005 : true

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={carteira ? `Extrato · ${carteira.nome}` : 'Extrato'}
      icone="fa-receipt"
    >
      {error ? (
        <div className="empty">{mensagemDeErro(error)}</div>
      ) : isLoading ? (
        <div className="empty">Carregando</div>
      ) : !data || data.movimentos.length === 0 ? (
        <div className="empty">
          Nenhuma movimentação ainda. O dinheiro só entra ou sai desta conta quando o recebimento
          ou o pagamento é registrado.
        </div>
      ) : (
        <>
          <div className="ex-resumo">
            <div className="ex-bloco">
              <span>Entradas</span>
              <b style={{ color: 'var(--income)' }}>{fmtMoeda(data.entradas)}</b>
            </div>
            <div className="ex-bloco">
              <span>Saídas</span>
              <b style={{ color: 'var(--expense)' }}>{fmtMoeda(data.saidas)}</b>
            </div>
          </div>

          {/* O saldo sai numa linha propria: em tres colunas o valor nao cabia
              e vinha cortado, justo o numero que o extrato existe para provar. */}
          <div className="ex-saldo">
            <span>Saldo</span>
            <b>{fmtMoeda(data.saldo)}</b>
          </div>

          {!confere ? (
            <div
              className="login-aviso"
              style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
            >
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>
                O extrato soma {fmtMoeda(data.saldo)}, mas a conta está gravada com{' '}
                {fmtMoeda(carteira?.saldo ?? 0)}. A diferença é de{' '}
                {fmtMoeda(Math.abs(data.saldo - (carteira?.saldo ?? 0)))}.
              </span>
            </div>
          ) : null}

          <div className="ex-lista">
            {data.movimentos.map((m) => {
              const entrada = m.efeito > 0
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
        </>
      )}
    </Sheet>
  )
}
