import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

const CHAVE = 'estlim.cache'

/**
 * Guarda o cache do React Query no IndexedDB, para o app abrir com os dados do
 * mês na tela mesmo sem rede. Por que IndexedDB e não localStorage: o cache
 * passa de alguns megabytes com facilidade, e localStorage trava em 5 MB e
 * bloqueia a thread principal a cada escrita.
 */
export const persistidorDoCache = createAsyncStoragePersister({
  key: CHAVE,
  storage: {
    getItem: (chave) => get(chave).then((v) => v ?? null),
    setItem: (chave, valor) => set(chave, valor),
    removeItem: (chave) => del(chave),
  },
  throttleTime: 2000,
})

/** Limpa o cache de disco. Usado quando o usuário sai da conta. */
export const limparCachePersistido = () => del(CHAVE)
