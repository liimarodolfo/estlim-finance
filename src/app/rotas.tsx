import { createBrowserRouter } from 'react-router-dom'
import { Shell } from '@/app/Shell'
import Dashboard from '@/features/dashboard/Dashboard'
import Lancamentos from '@/features/lancamentos/Lancamentos'
import Carteira from '@/features/carteira/Carteira'
import Investimentos from '@/features/investimentos/Investimentos'
import Agenda from '@/features/agenda/Agenda'
import Categorias from '@/features/categorias/Categorias'
import Perfil from '@/features/perfil/Perfil'
import { NaoEncontrada } from '@/app/NaoEncontrada'

export const rotas = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'lancamentos', element: <Lancamentos /> },
      { path: 'carteira', element: <Carteira /> },
      { path: 'investir', element: <Investimentos /> },
      { path: 'agenda', element: <Agenda /> },
      { path: 'categorias', element: <Categorias /> },
      { path: 'perfil', element: <Perfil /> },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
], {
  // Liga desde ja o comportamento do react-router 7, para a migracao nao doer depois.
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
})
