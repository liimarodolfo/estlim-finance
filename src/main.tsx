import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { rotas } from '@/app/rotas'
import { queryClient } from '@/app/query'
import { aplicarTema, useTema } from '@/store/useTema'
import { ToastZone } from '@/ui/ToastZone'
import { BarraPWA } from '@/ui/BarraPWA'
import { persistidorDoCache } from '@/app/persistencia'
import '@/styles/index.css'

// O tema ja foi pintado pelo script do index.html; aqui o estado do app assume.
aplicarTema(useTema.getState().tema)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persistidorDoCache,
        // Cache mais velho que um dia nao vale a pena restaurar: abrir o app com
        // numero de ontem e pior do que abrir carregando.
        maxAge: 1000 * 60 * 60 * 24,
        // Suba este numero sempre que o formato de algum dado em cache mudar.
        // O cache guardado em disco sobrevive ao deploy, entao codigo novo lendo
        // dado velho quebra na cara do usuario: os relatorios passaram a devolver
        // { previsto, realizado } no lugar de um numero solto, e sem o buster a
        // tela abriria com R$ NaN ate o cache vencer.
        buster: 'v2',
      }}
    >
      <ToastZone />
      <BarraPWA />
      <RouterProvider router={rotas} future={{ v7_startTransition: true }} />
    </PersistQueryClientProvider>
  </StrictMode>,
)
