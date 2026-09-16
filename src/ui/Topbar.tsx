import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/ui/Logo'
import { MesPills } from '@/ui/MesPills'
import { PainelNotificacoes } from '@/ui/PainelNotificacoes'
import { SheetBusca } from '@/features/lancamentos/SheetBusca'
import { SheetValor } from '@/features/lancamentos/SheetValor'
import { useTema } from '@/store/useTema'
import { usePerfil } from '@/hooks/usePerfil'
import { useCategorias } from '@/hooks/useCategorias'
import { useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes'
import { iniciais } from '@/lib/formatters'
import type { LancamentoComBaixa } from '@/hooks/useLancamentos'

export function Topbar() {
  const tema = useTema((e) => e.tema)
  const alternar = useTema((e) => e.alternar)
  const navigate = useNavigate()
  const { data: perfil } = usePerfil()
  const { data: categorias = [] } = useCategorias()
  const notificacoes = useNotificacoes()

  const sino = useRef<HTMLButtonElement>(null)
  const [painelAberto, setPainelAberto] = useState(false)
  const [lidas, setLidas] = useState(false)
  const [valorAberto, setValorAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [emFoco, setEmFoco] = useState<LancamentoComBaixa | null>(null)

  // O dot volta quando surge notificação nova depois de aberto o painel.
  const temNovidade = notificacoes.length > 0 && !lidas

  const abrirPainel = () => {
    setPainelAberto((a) => !a)
    setLidas(true)
  }

  const tocarNotificacao = (n: Notificacao) => {
    if (!n.lancamento) return
    setEmFoco(n.lancamento)
    setValorAberto(true)
    setPainelAberto(false)
  }

  return (
    <>
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
              title="Buscar lançamento"
              aria-label="Buscar lançamento"
              onClick={() => setBuscaAberta(true)}
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
            <button
              type="button"
              className="icon-btn"
              title={tema === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              aria-label={tema === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              onClick={alternar}
            >
              <i className={`fa-solid ${tema === 'light' ? 'fa-moon' : 'fa-sun'}`} />
            </button>
            <button
              type="button"
              className={`icon-btn${temNovidade ? ' shake' : ''}`}
              title="Notificações"
              aria-label={`Notificações${notificacoes.length ? `, ${notificacoes.length} novas` : ''}`}
              ref={sino}
              onClick={abrirPainel}
            >
              <i className="fa-solid fa-bell" />
              {temNovidade ? <i className="badge-dot" /> : null}
            </button>
            <button
              type="button"
              className="avatar"
              title="Perfil"
              aria-label="Perfil"
              onClick={() => navigate('/perfil')}
            >
              {perfil?.fotoAssinada ? (
                <img src={perfil.fotoAssinada} alt="Perfil" />
              ) : (
                iniciais(perfil?.nome ?? '')
              )}
            </button>
          </div>
        </div>
        <MesPills />
      </header>

      <SheetBusca aberto={buscaAberta} aoFechar={() => setBuscaAberta(false)} />

      <PainelNotificacoes
        aberto={painelAberto}
        aoFechar={() => setPainelAberto(false)}
        notificacoes={notificacoes}
        aoTocar={tocarNotificacao}
        sino={sino}
      />

      <SheetValor
        key={`notif-valor-${emFoco?.id ?? ''}-${valorAberto}`}
        aberto={valorAberto}
        aoFechar={() => setValorAberto(false)}
        lancamento={emFoco}
        categoria={categorias.find((c) => c.id === emFoco?.categoria_id)}
      />
    </>
  )
}
