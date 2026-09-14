import { useState } from 'react'
import { Logo } from '@/ui/Logo'
import { CampoSenha } from '@/ui/CampoSenha'
import { cadastrar, entrar, recuperarSenha } from '@/hooks/useSessao'
import { toast } from '@/store/useToasts'

type Modo = 'entrar' | 'criar'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINIMO_SENHA = 8

/** Mensagens do Supabase chegam em inglês. Aqui viram português do Brasil. */
function traduzirErro(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro)
  const m = bruto.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar. O link está na sua caixa de entrada.'
  if (m.includes('convite')) return 'Este e-mail não tem convite para o ESTLIM.'
  if (m.includes('user already registered')) return 'Este e-mail já tem conta. Use Entrar.'
  if (m.includes('password should be')) return `A senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (m.includes('failed to fetch')) return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
  return bruto
}

export default function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setAviso(null)
    setSenha('')
    setConfirmacao('')
  }

  const validar = (): string | null => {
    if (!EMAIL_VALIDO.test(email.trim())) return 'Informe um e-mail válido.'
    if (!senha) return 'Informe a senha.'
    if (modo === 'criar') {
      if (senha.length < MINIMO_SENHA) return `A senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`
      if (senha !== confirmacao) return 'As senhas não conferem.'
    }
    return null
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setAviso(null)

    const problema = validar()
    if (problema) {
      setErro(problema)
      return
    }

    setOcupado(true)
    try {
      if (modo === 'entrar') {
        await entrar(email, senha)
        // A troca de rota acontece sozinha quando a sessão muda.
      } else {
        const { precisaConfirmarEmail } = await cadastrar(email, senha)
        if (precisaConfirmarEmail) {
          setAviso('Conta criada. Confirme o e-mail pelo link que acabamos de enviar e depois entre.')
          setModo('entrar')
          setSenha('')
          setConfirmacao('')
        }
      }
    } catch (problemaDoServidor) {
      setErro(traduzirErro(problemaDoServidor))
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

        <div className="login-abas">
          <button
            type="button"
            className={`chip${modo === 'entrar' ? ' active' : ''}`}
            onClick={() => trocarModo('entrar')}
          >
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
            Entrar
          </button>
          <button
            type="button"
            className={`chip${modo === 'criar' ? ' active' : ''}`}
            onClick={() => trocarModo('criar')}
          >
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            Primeiro acesso
          </button>
        </div>

        <form className="card" onSubmit={enviar} noValidate>
          {erro ? (
            <div className="login-erro" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          ) : null}
          {aviso ? (
            <div className="login-aviso" role="status">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <span>{aviso}</span>
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
            placeholder={modo === 'criar' ? `Mínimo de ${MINIMO_SENHA} caracteres` : '••••••••'}
            autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
          />

          {modo === 'criar' ? (
            <CampoSenha
              id="confirmacao"
              rotulo="Confirmar senha"
              icone="fa-key"
              valor={confirmacao}
              aoMudar={setConfirmacao}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          ) : null}

          <button type="submit" className="btn-primary" disabled={ocupado}>
            <i
              className={`fa-solid ${ocupado ? 'fa-spinner fa-spin' : modo === 'entrar' ? 'fa-right-to-bracket' : 'fa-user-plus'}`}
              style={{ marginRight: 8 }}
              aria-hidden="true"
            />
            {ocupado ? 'Aguarde' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="login-rodape">
          {modo === 'entrar' ? (
            <button type="button" onClick={esqueci}>
              Esqueci minha senha
            </button>
          ) : (
            'O primeiro acesso só funciona para os e-mails convidados.'
          )}
        </p>
      </div>
    </div>
  )
}
