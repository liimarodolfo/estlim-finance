import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Cada tabela avisa quais caches ficam velhos quando ela muda.
const CACHES_POR_TABELA: Record<string, string[]> = {
  lancamentos: ['lancamentos', 'gastos-por-categoria', 'dashboard', 'balanco'],
  pagamentos: ['lancamentos', 'gastos-por-categoria', 'dashboard', 'balanco'],
  carteiras: ['carteiras', 'lancamentos', 'dashboard'],
  investimentos: ['investimentos', 'dashboard'],
  corretoras: ['corretoras'],
  categorias: ['categorias', 'gastos-por-categoria'],
  balancos: ['balanco'],
  ajustes: ['carteiras', 'lancamentos', 'dashboard'],
  perfis: ['perfil'],
}

/**
 * Mantém os dois aparelhos em sincronia: uma baixa feita no celular reflete no
 * desktop sem ninguém recarregar nada. O RLS vale aqui também, então só chegam
 * mudanças das linhas do próprio casal.
 */
export function useRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const canal = supabase.channel('estlim')

    for (const [tabela, caches] of Object.entries(CACHES_POR_TABELA)) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
        for (const chave of caches) qc.invalidateQueries({ queryKey: [chave] })
      })
    }

    canal.subscribe((status, erro) => {
      // Em desenvolvimento, dizer em voz alta se o canal nao conectou poupa
      // muito tempo: sem isso a falha e silenciosa e a tela so parece velha.
      if (import.meta.env.DEV) console.info('[realtime]', status, erro ?? '')
    })
    return () => {
      supabase.removeChannel(canal)
    }
  }, [qc])
}
