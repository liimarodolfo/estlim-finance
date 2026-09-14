// Arquivo gerado a partir do schema do Supabase. Nao editar na mao.
// Regerar apos cada migration com: pnpm types:supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      ajustes: {
        Row: {
          carteira_id: string
          casal_id: string
          criado_em: string
          criado_por: string | null
          id: string
          lancamento_id: string | null
          motivo: string
          tipo: Database['public']['Enums']['ajuste_tipo']
          valor: number
        }
        Insert: {
          carteira_id: string
          casal_id: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          lancamento_id?: string | null
          motivo: string
          tipo: Database['public']['Enums']['ajuste_tipo']
          valor: number
        }
        Update: {
          carteira_id?: string
          casal_id?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          lancamento_id?: string | null
          motivo?: string
          tipo?: Database['public']['Enums']['ajuste_tipo']
          valor?: number
        }
        Relationships: []
      }
      balancos: {
        Row: {
          ano: number
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          casal_id: string
          despesas_previstas: number | null
          despesas_realizadas: number | null
          id: string
          mes: number
          receitas_previstas: number | null
          receitas_realizadas: number | null
        }
        Insert: {
          ano: number
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          casal_id: string
          despesas_previstas?: number | null
          despesas_realizadas?: number | null
          id?: string
          mes: number
          receitas_previstas?: number | null
          receitas_realizadas?: number | null
        }
        Update: {
          ano?: number
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          casal_id?: string
          despesas_previstas?: number | null
          despesas_realizadas?: number | null
          id?: string
          mes?: number
          receitas_previstas?: number | null
          receitas_realizadas?: number | null
        }
        Relationships: []
      }
      carteiras: {
        Row: {
          ativo: boolean
          banco: string | null
          banco_nome: string | null
          bandeira: string | null
          casal_id: string
          cor_gradiente: string | null
          criado_em: string
          descricao: string | null
          dia_fechamento: number | null
          dia_vencimento: number | null
          dono: Database['public']['Enums']['dono_tipo']
          funcao: string | null
          id: string
          limite: number
          nome: string
          saldo: number
          tipo: Database['public']['Enums']['carteira_tipo']
          usado: number
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          banco_nome?: string | null
          bandeira?: string | null
          casal_id: string
          cor_gradiente?: string | null
          criado_em?: string
          descricao?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          dono: Database['public']['Enums']['dono_tipo']
          funcao?: string | null
          id?: string
          limite?: number
          nome: string
          saldo?: number
          tipo: Database['public']['Enums']['carteira_tipo']
          usado?: number
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          banco_nome?: string | null
          bandeira?: string | null
          casal_id?: string
          cor_gradiente?: string | null
          criado_em?: string
          descricao?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          dono?: Database['public']['Enums']['dono_tipo']
          funcao?: string | null
          id?: string
          limite?: number
          nome?: string
          saldo?: number
          tipo?: Database['public']['Enums']['carteira_tipo']
          usado?: number
        }
        Relationships: []
      }
      casais: {
        Row: {
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          casal_id: string
          cor: string
          icone: string
          id: string
          nome: string
          orcamento_mensal: number
          protegida: boolean
        }
        Insert: {
          casal_id: string
          cor?: string
          icone?: string
          id?: string
          nome: string
          orcamento_mensal?: number
          protegida?: boolean
        }
        Update: {
          casal_id?: string
          cor?: string
          icone?: string
          id?: string
          nome?: string
          orcamento_mensal?: number
          protegida?: boolean
        }
        Relationships: []
      }
      corretoras: {
        Row: {
          casal_id: string
          cor: string
          criado_em: string
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          casal_id: string
          cor?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          casal_id?: string
          cor?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      investimentos: {
        Row: {
          carteira_id: string | null
          casal_id: string
          corretora_id: string | null
          criado_em: string
          descricao: string | null
          dono: Database['public']['Enums']['dono_tipo']
          id: string
          instituicao_tipo: Database['public']['Enums']['instituicao_tipo']
          nome: string
          rentabilidade: string | null
          sub: Database['public']['Enums']['invest_sub']
          valor: number
        }
        Insert: {
          carteira_id?: string | null
          casal_id: string
          corretora_id?: string | null
          criado_em?: string
          descricao?: string | null
          dono: Database['public']['Enums']['dono_tipo']
          id?: string
          instituicao_tipo: Database['public']['Enums']['instituicao_tipo']
          nome: string
          rentabilidade?: string | null
          sub: Database['public']['Enums']['invest_sub']
          valor?: number
        }
        Update: {
          carteira_id?: string | null
          casal_id?: string
          corretora_id?: string | null
          criado_em?: string
          descricao?: string | null
          dono?: Database['public']['Enums']['dono_tipo']
          id?: string
          instituicao_tipo?: Database['public']['Enums']['instituicao_tipo']
          nome?: string
          rentabilidade?: string | null
          sub?: Database['public']['Enums']['invest_sub']
          valor?: number
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          cartao_id: string | null
          casal_id: string
          categoria_id: string | null
          criado_em: string
          criado_por: string | null
          data_emissao: string | null
          data_vencimento: string
          descricao: string
          dono: Database['public']['Enums']['dono_tipo']
          forma_metodo: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref: string | null
          grupo_parcelas: string | null
          id: string
          investimento_id: string | null
          natureza: Database['public']['Enums']['natureza_tipo']
          pagar_a: string | null
          parcela_atual: number | null
          parcela_total: number | null
          status: Database['public']['Enums']['status_tipo']
          tipo: Database['public']['Enums']['lanc_tipo']
          tipo_valor: Database['public']['Enums']['valor_tipo']
          valor_previsto: number | null
        }
        Insert: {
          cartao_id?: string | null
          casal_id: string
          categoria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_emissao?: string | null
          data_vencimento: string
          descricao: string
          dono: Database['public']['Enums']['dono_tipo']
          forma_metodo?: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref?: string | null
          grupo_parcelas?: string | null
          id?: string
          investimento_id?: string | null
          natureza?: Database['public']['Enums']['natureza_tipo']
          pagar_a?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          status?: Database['public']['Enums']['status_tipo']
          tipo: Database['public']['Enums']['lanc_tipo']
          tipo_valor?: Database['public']['Enums']['valor_tipo']
          valor_previsto?: number | null
        }
        Update: {
          cartao_id?: string | null
          casal_id?: string
          categoria_id?: string | null
          criado_em?: string
          criado_por?: string | null
          data_emissao?: string | null
          data_vencimento?: string
          descricao?: string
          dono?: Database['public']['Enums']['dono_tipo']
          forma_metodo?: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref?: string | null
          grupo_parcelas?: string | null
          id?: string
          investimento_id?: string | null
          natureza?: Database['public']['Enums']['natureza_tipo']
          pagar_a?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          status?: Database['public']['Enums']['status_tipo']
          tipo?: Database['public']['Enums']['lanc_tipo']
          tipo_valor?: Database['public']['Enums']['valor_tipo']
          valor_previsto?: number | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          confirmado_por: string | null
          criado_em: string
          data_pagamento: string
          forma_metodo: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref: string | null
          hora_pagamento: string
          id: string
          lancamento_id: string
          valor_pago: number
        }
        Insert: {
          confirmado_por?: string | null
          criado_em?: string
          data_pagamento: string
          forma_metodo?: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref?: string | null
          hora_pagamento: string
          id?: string
          lancamento_id: string
          valor_pago: number
        }
        Update: {
          confirmado_por?: string | null
          criado_em?: string
          data_pagamento?: string
          forma_metodo?: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref?: string | null
          hora_pagamento?: string
          id?: string
          lancamento_id?: string
          valor_pago?: number
        }
        Relationships: []
      }
      perfis: {
        Row: {
          casal_id: string
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          casal_id: string
          criado_em?: string
          foto_url?: string | null
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          casal_id?: string
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_lancamentos: {
        Row: {
          cartao_id: string | null
          casal_id: string | null
          categoria_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_emissao: string | null
          data_vencimento: string | null
          descricao: string | null
          dia_exibido: number | null
          dono: Database['public']['Enums']['dono_tipo'] | null
          forma_metodo: Database['public']['Enums']['metodo_tipo'] | null
          forma_ref: string | null
          grupo_parcelas: string | null
          id: string | null
          investimento_id: string | null
          natureza: Database['public']['Enums']['natureza_tipo'] | null
          pagar_a: string | null
          parcela_atual: number | null
          parcela_total: number | null
          status: Database['public']['Enums']['status_tipo'] | null
          tipo: Database['public']['Enums']['lanc_tipo'] | null
          tipo_valor: Database['public']['Enums']['valor_tipo'] | null
          valor_exibido: number | null
          valor_previsto: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_criar_ajuste: {
        Args: {
          p_carteira_id: string
          p_tipo: Database['public']['Enums']['ajuste_tipo']
          p_valor: number
          p_motivo: string
        }
        Returns: string
      }
      fn_excluir_carteira: {
        Args: { p_carteira_id: string }
        Returns: string
      }
    }
    Enums: {
      ajuste_tipo: 'entrada' | 'retirada'
      carteira_tipo: 'conta' | 'cartao' | 'dinheiro'
      dono_tipo: 'Rodolfo' | 'Thainy' | 'Casal' | 'RLiima'
      instituicao_tipo: 'banco' | 'corretora'
      invest_sub: 'ativo' | 'caixinha'
      lanc_tipo: 'receita' | 'despesa' | 'investimento'
      metodo_tipo: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'transferencia'
      natureza_tipo: 'fixa' | 'avulsa' | 'parcelada'
      status_tipo: 'pendente' | 'pago' | 'atrasado'
      valor_tipo: 'fixo' | 'variavel'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database['public']

export type Tables<T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]

// Atalhos usados pelas telas.
export type Dono = Enums<'dono_tipo'>
export type LancTipo = Enums<'lanc_tipo'>
export type Natureza = Enums<'natureza_tipo'>
export type TipoValor = Enums<'valor_tipo'>
export type StatusLanc = Enums<'status_tipo'>
export type MetodoPagamento = Enums<'metodo_tipo'>
export type TipoCarteira = Enums<'carteira_tipo'>
export type SubInvestimento = Enums<'invest_sub'>
export type TipoInstituicao = Enums<'instituicao_tipo'>
export type TipoAjuste = Enums<'ajuste_tipo'>

export type Carteira = Tables<'carteiras'>
export type Categoria = Tables<'categorias'>
export type Corretora = Tables<'corretoras'>
export type Investimento = Tables<'investimentos'>
export type Lancamento = Tables<'lancamentos'>
export type LancamentoExibido = Tables<'v_lancamentos'>
export type Pagamento = Tables<'pagamentos'>
export type Perfil = Tables<'perfis'>
export type Balanco = Tables<'balancos'>
export type Ajuste = Tables<'ajustes'>
