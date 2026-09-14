import { QueryClient } from '@tanstack/react-query'

// Dados financeiros mudam pouco dentro de uma sessao e o Realtime invalida
// o cache quando o outro aparelho grava algo (Epico 12).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
