import { useState } from 'react'
import { Logo } from '@/ui/Logo'
import { CampoSenha } from '@/ui/CampoSenha'
import { entrar, recuperarSenha } from '@/hooks/useSessao'
import { toast } from '@/store/useToasts'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mensagens do Supabase chegam em inglês. Aqui viram português do Brasil. */
function traduzirErro(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro)
  const m = bruto.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar. O link está na sua caixa de entrada.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (m.includes('failed to fetch')) return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  return bruto
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!EMAIL_VALIDO.test(email.trim())) {
      setErro('Informe um e-mail válido.')
      return
    }
    if (!senha) {
      setErro('Informe a senha.')
      return
    }

    setOcupado(true)
    try {
      await entrar(email, senha)
      // A troca de tela acontece sozinha quando a sessão muda.
    } catch (problema) {
      setErro(traduzirErro(problema))
    } finally {
      setOcupado(false)
    }
  }

  const esqueci = async () => {
    if (!EMAIL_VALIDO.test(email.trim())) {
      setErro('Escreva o e-mail acima para receber o link de nova senha.')
      return
    }
    setErro(null)
    try {
      await recuperarSenha(email)
      toast('Link de nova senha enviado', 'fa-envelope')
    } catch (problema) {
      setErro(traduzirErro(problema))
    }
  }

  return (
    <div className="login-tela">
      <div className="login-caixa">
        <div className="hero-card login-hero">
          <div className="logo-wrap">
            <Logo />
            <span className="logo-text">ESTLIM</span>
          </div>
          <p>Planejamento e controle financeiro do casal</p>
        </div>

        <form className="card" onSubmit={enviar} noValidate>
          {erro ? (
            <div className="login-erro" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="email">
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              E-mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@rliima.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <CampoSenha
            id="senha"
            rotulo="Senha"
            icone="fa-lock"
            valor={senha}
            aoMudar={setSenha}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <button type="submit" className="btn-primary" disabled={ocupado}>
            <i
              className={`fa-solid ${ocupado ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'}`}
              style={{ marginRight: 8 }}
              aria-hidden="true"
            />
            {ocupado ? 'Aguarde' : 'Entrar'}
          </button>
        </form>

        <p className="login-rodape">
          <button type="button" onClick={esqueci}>
            Esqueci minha senha
          </button>
        </p>
      </div>
    </div>
  )
}
