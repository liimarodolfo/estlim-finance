import { useNavigate } from 'react-router-dom'
import { Logo } from '@/ui/Logo'
import { MesPills } from '@/ui/MesPills'
import { useTema } from '@/store/useTema'

export function Topbar() {
  const tema = useTema((e) => e.tema)
  const alternar = useTema((e) => e.alternar)
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="logo-wrap">
          <Logo />
          <span className="logo-text">ESTLIM</span>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            title={tema === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            aria-label={tema === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            onClick={alternar}
          >
            <i className={`fa-solid ${tema === 'light' ? 'fa-moon' : 'fa-sun'}`} />
          </button>
          <button type="button" className="icon-btn" title="Notificações" aria-label="Notificações">
            <i className="fa-solid fa-bell" />
          </button>
          <button
            type="button"
            className="avatar"
            title="Perfil"
            aria-label="Perfil"
            onClick={() => navigate('/perfil')}
          >
            RT
          </button>
        </div>
      </div>
      <MesPills />
    </header>
  )
}
