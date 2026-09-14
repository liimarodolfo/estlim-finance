import { Link } from 'react-router-dom'
import { Tela } from '@/ui/Tela'

export function NaoEncontrada() {
  return (
    <Tela>
      <div className="card">
        <div className="empty">
          <i className="fa-solid fa-compass" style={{ fontSize: 22, display: 'block', marginBottom: 10 }} aria-hidden="true" />
          Esta tela não existe.
          <br />
          <Link to="/" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            Voltar para o início
          </Link>
        </div>
      </div>
    </Tela>
  )
}
