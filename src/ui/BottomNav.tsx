import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ABAS } from '@/app/abas'

export function BottomNav() {
  const nav = useRef<HTMLElement>(null)
  const indicador = useRef<HTMLSpanElement>(null)
  const { pathname } = useLocation()

  const moverIndicador = useCallback(() => {
    const ativo = nav.current?.querySelector<HTMLAnchorElement>('.nav-item.active')
    const ind = indicador.current
    if (!ind) return
    if (!ativo) {
      ind.style.width = '0px'
      return
    }
    ind.style.left = `${ativo.offsetLeft}px`
    ind.style.width = `${ativo.offsetWidth}px`
  }, [])

  useLayoutEffect(() => {
    moverIndicador()
    // A aba ativa cresce por transicao, entao o indicador acerta o destino no fim dela.
    const t = window.setTimeout(moverIndicador, 420)
    return () => window.clearTimeout(t)
  }, [pathname, moverIndicador])

  useEffect(() => {
    window.addEventListener('resize', moverIndicador)
    return () => window.removeEventListener('resize', moverIndicador)
  }, [moverIndicador])

  return (
    <nav className="bottomnav" ref={nav} aria-label="Navegação principal">
      <span className="nav-ind" ref={indicador} aria-hidden="true" />
      {ABAS.map((aba) => (
        <NavLink
          key={aba.para}
          to={aba.para}
          end={aba.para === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <i className={`ico fa-solid ${aba.icone}`} aria-hidden="true" />
          <span className="lbl">{aba.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  )
}
