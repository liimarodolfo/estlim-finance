import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { rotas } from '@/app/rotas'
import { queryClient } from '@/app/query'
import { aplicarTema, useTema } from '@/store/useTema'
import { ToastZone } from '@/ui/ToastZone'
import '@/styles/index.css'

// O tema ja foi pintado pelo script do index.html; aqui o estado do app assume.
aplicarTema(useTema.getState().tema)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastZone />
      <RouterProvider router={rotas} future={{ v7_startTransition: true }} />
    </QueryClientProvider>
  </StrictMode>,
)
