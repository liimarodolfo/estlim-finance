import { useState } from 'react'

type Props = {
  id: string
  rotulo: string
  icone: string
  valor: string
  aoMudar: (valor: string) => void
  placeholder?: string
  autoComplete?: string
}

/** Campo de senha com o olho de mostrar e esconder, igual ao do protótipo. */
export function CampoSenha({ id, rotulo, icone, valor, aoMudar, placeholder, autoComplete }: Props) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="field">
      <label htmlFor={id}>
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
        {rotulo}
      </label>
      <div className="pwd-wrap">
        <input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="eye"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          title={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
        >
          <i className={`fa-solid ${visivel ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
