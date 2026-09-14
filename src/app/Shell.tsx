import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Topbar } from '@/ui/Topbar'
import { BottomNav } from '@/ui/BottomNav'
import { FAB } from '@/ui/FAB'
import { useRipple } from '@/ui/useRipple'

export function Shell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  useRipple()

  // A orquestracao de entrada roda uma vez. Depois disso, so movimento por acao.
  useEffect(() => {
    const t = window.setTimeout(() => document.body.classList.remove('boot'), 1600)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <>
      <Topbar />
      <Outlet />
      <FAB aoClicar={() => navigate('/lancamentos')} />
      <BottomNav />
    </>
  )
}
