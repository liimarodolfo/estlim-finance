import { useState } from 'react'
import { mascaraTelefone } from '@/lib/masks'
import { toast } from '@/store/useToasts'
import { useSalvarPerfil, useTrocarEmail } from '@/hooks/usePerfil'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : String(erro))

type Props = {
  nomeInicial: string
  telefoneInicial: string
  emailDaSessao: string
}

/**
 * Recebe os valores iniciais por prop e é remontado por key quando o perfil muda,
 * em vez de copiar o servidor para o estado dentro de um efeito.
 */
export function DadosPessoais({ nomeInicial, telefoneInicial, emailDaSessao }: Props) {
  const [nome, setNome] = useState(nomeInicial)
  const [email, setEmail] = useState(emailDaSessao)
  const [telefone, setTelefone] = useState(telefoneInicial)
  const salvar = useSalvarPerfil()
  const trocarEmail = useTrocarEmail()

  const aoSalvar = async () => {
    if (!nome.trim()) {
      toast('Informe o nome', 'fa-triangle-exclamation')
      return
    }
    if (!EMAIL_VALIDO.test(email.trim())) {
      toast('Informe um e-mail válido', 'fa-triangle-exclamation')
      return
    }
    try {
      await salvar.mutateAsync({ nome: nome.trim(), telefone: telefone.trim() })
      if (email.trim().toLowerCase() !== emailDaSessao.toLowerCase()) {
        await trocarEmail.mutateAsync(email)
        toast('Confirme o novo e-mail pelo link enviado', 'fa-envelope')
      } else {
        toast('Perfil atualizado', 'fa-circle-check')
      }
    } catch (erro) {
      toast(mensagem(erro), 'fa-triangle-exclamation')
    }
  }

  const ocupado = salvar.isPending || trocarEmail.isPending

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="pNome">
          <i className="fa-solid fa-signature" aria-hidden="true" />
          Nome
        </label>
        <input
          id="pNome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="pEmail">
          <i className="fa-solid fa-envelope" aria-hidden="true" />
          E-mail
        </label>
        <input
          id="pEmail"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@rliima.com"
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="pFone">
          <i className="fa-solid fa-phone" aria-hidden="true" />
          Telefone
        </label>
        <input
          id="pFone"
          type="tel"
          inputMode="numeric"
          maxLength={15}
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          placeholder="(16) 99999-0000"
          autoComplete="tel"
        />
      </div>
      <button type="button" className="btn-primary" onClick={aoSalvar} disabled={ocupado}>
        <i
          className={`fa-solid ${ocupado ? 'fa-spinner fa-spin' : 'fa-check'}`}
          style={{ marginRight: 8 }}
          aria-hidden="true"
        />
        Salvar alterações
      </button>
    </div>
  )
}
