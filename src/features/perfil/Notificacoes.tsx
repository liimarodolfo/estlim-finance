import { TituloSecao } from '@/ui/TituloSecao'
import { mensagemDeErro } from '@/lib/erros'
import { toast } from '@/store/useToasts'
import { useAtivarPush, useDesativarPush, useSituacaoPush } from '@/hooks/usePush'

/**
 * Liga e desliga as notificações no aparelho.
 *
 * O botão precisa existir de verdade: a permissão do navegador só é concedida a
 * partir de um toque do usuário. Pedir na carga da tela faz o iOS recusar sem
 * dizer nada.
 */
export function Notificacoes() {
  const { data: situacao, isLoading } = useSituacaoPush()
  const ativar = useAtivarPush()
  const desativar = useDesativarPush()

  const aoAtivar = async () => {
    try {
      await ativar.mutateAsync()
      toast('Notificações ativadas neste aparelho', 'fa-bell')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoDesativar = async () => {
    try {
      await desativar.mutateAsync()
      toast('Notificações desligadas neste aparelho', 'fa-bell-slash')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <>
      <TituloSecao icone="fa-bell">Notificações no aparelho</TituloSecao>
      <div className="card">
        <div className="bl-formula">
          Avisamos quando uma conta vence amanhã, quando vence hoje, quando alguma atrasa e quando a
          fatura do cartão fecha esperando o valor final. Uma vez por dia, de manhã. O sino aqui
          dentro continua mostrando tudo de qualquer jeito.
        </div>

        {isLoading ? (
          <div className="empty">Verificando este aparelho</div>
        ) : situacao === 'pronto' ? (
          <>
            <div className="login-aviso" style={{ background: 'var(--income-soft)', color: 'var(--income)' }}>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>Este aparelho já recebe as notificações.</span>
            </div>
            <button
              type="button"
              className="btn-danger-link"
              onClick={aoDesativar}
              disabled={desativar.isPending}
            >
              <i className="fa-solid fa-bell-slash" style={{ marginRight: 8 }} aria-hidden="true" />
              Desligar neste aparelho
            </button>
          </>
        ) : situacao === 'precisa-instalar' ? (
          <div className="login-aviso" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
            <i className="fa-solid fa-mobile-screen" aria-hidden="true" />
            <span>
              No iPhone e no iPad, a notificação só funciona com o ESTLIM instalado na tela de
              início. Toque em Compartilhar, escolha Adicionar à Tela de Início, abra o app por lá e
              volte aqui.
            </span>
          </div>
        ) : situacao === 'negado' ? (
          <div className="login-aviso" style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}>
            <i className="fa-solid fa-bell-slash" aria-hidden="true" />
            <span>
              A permissão foi negada neste aparelho. Para liberar, vá nos ajustes do sistema, na
              parte de notificações do ESTLIM.
            </span>
          </div>
        ) : situacao === 'sem-suporte' ? (
          <div className="login-aviso">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>Este navegador não recebe notificações. Tente pelo celular, com o app instalado.</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={aoAtivar}
            disabled={ativar.isPending}
          >
            <i
              className={`fa-solid ${ativar.isPending ? 'fa-spinner fa-spin' : 'fa-bell'}`}
              style={{ marginRight: 8 }}
              aria-hidden="true"
            />
            Ativar notificações neste aparelho
          </button>
        )}
      </div>
    </>
  )
}
