import { useRef, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { CampoSenha } from '@/ui/CampoSenha'
import { iniciais } from '@/lib/formatters'
import { toast } from '@/store/useToasts'
import { sair, useSessao } from '@/hooks/useSessao'
import { useEnviarFoto, usePerfil, useTrocarSenha } from '@/hooks/usePerfil'
import { DadosPessoais } from '@/features/perfil/DadosPessoais'
import { mensagemDeErro } from '@/lib/erros'

const MINIMO_SENHA = 8

export default function Perfil() {
  const { sessao } = useSessao()
  const { data: perfil, isLoading } = usePerfil()
  const enviarFoto = useEnviarFoto()
  const trocarSenha = useTrocarSenha()
  const arquivo = useRef<HTMLInputElement>(null)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConf, setSenhaConf] = useState('')

  const emailDaSessao = sessao?.user.email ?? ''

  const aoTrocarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      await enviarFoto.mutateAsync(f)
      toast('Foto de perfil atualizada', 'fa-camera')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoTrocarSenha = async () => {
    if (!senhaAtual) {
      toast('Informe a senha atual', 'fa-triangle-exclamation')
      return
    }
    if (senhaNova.length < MINIMO_SENHA) {
      toast(`A nova senha precisa de ${MINIMO_SENHA} caracteres ou mais`, 'fa-triangle-exclamation')
      return
    }
    if (senhaNova !== senhaConf) {
      toast('As senhas não conferem', 'fa-triangle-exclamation')
      return
    }
    try {
      await trocarSenha.mutateAsync({ email: emailDaSessao, atual: senhaAtual, nova: senhaNova })
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaConf('')
      toast('Senha atualizada com sucesso', 'fa-shield-halved')
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoSair = async () => {
    try {
      await sair()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Tela id="view-perfil">
      <div className="hero-card perfil-hero">
        <button
          type="button"
          className="pf-avatar"
          onClick={() => arquivo.current?.click()}
          title="Trocar a foto"
          aria-label="Trocar a foto de perfil"
        >
          {perfil?.fotoAssinada ? (
            <img src={perfil.fotoAssinada} alt="Foto de perfil" />
          ) : (
            iniciais(perfil?.nome ?? '')
          )}
          <span className="pf-cam" aria-hidden="true">
            <i className={`fa-solid ${enviarFoto.isPending ? 'fa-spinner fa-spin' : 'fa-camera'}`} />
          </span>
        </button>
        <div className="pf-nome">{perfil?.nome ?? (isLoading ? 'Carregando' : '')}</div>
        <div className="pf-email">{emailDaSessao}</div>
      </div>
      <input
        ref={arquivo}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        aria-label="Arquivo da foto de perfil"
        onChange={aoTrocarFoto}
      />

      <TituloSecao icone="fa-id-card">Dados pessoais</TituloSecao>
      {perfil ? (
        <DadosPessoais
          key={`${perfil.id}:${emailDaSessao}`}
          nomeInicial={perfil.nome}
          telefoneInicial={perfil.telefone ?? ''}
          emailDaSessao={emailDaSessao}
        />
      ) : (
        <div className="card">
          <div className="empty">{isLoading ? 'Carregando o perfil' : 'Perfil não encontrado'}</div>
        </div>
      )}

      <TituloSecao icone="fa-shield-halved">Atualizar senha</TituloSecao>
      <div className="card">
        <CampoSenha
          id="pSenhaAtual"
          rotulo="Senha atual"
          icone="fa-lock"
          valor={senhaAtual}
          aoMudar={setSenhaAtual}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <CampoSenha
          id="pSenhaNova"
          rotulo="Nova senha"
          icone="fa-key"
          valor={senhaNova}
          aoMudar={setSenhaNova}
          placeholder={`Mínimo de ${MINIMO_SENHA} caracteres`}
          autoComplete="new-password"
        />
        <CampoSenha
          id="pSenhaConf"
          rotulo="Confirmar nova senha"
          icone="fa-key"
          valor={senhaConf}
          aoMudar={setSenhaConf}
          placeholder="Repita a nova senha"
          autoComplete="new-password"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={aoTrocarSenha}
          disabled={trocarSenha.isPending}
        >
          <i
            className={`fa-solid ${trocarSenha.isPending ? 'fa-spinner fa-spin' : 'fa-shield-halved'}`}
            style={{ marginRight: 8 }}
            aria-hidden="true"
          />
          Atualizar senha
        </button>
        <button type="button" className="btn-danger-link" onClick={aoSair}>
          <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: 8 }} aria-hidden="true" />
          Sair da conta
        </button>
      </div>
    </Tela>
  )
}
