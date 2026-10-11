export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      conferencia_emprestimos: {
        Row: {
          banco: string | null
          conferencia_id: string
          created_at: string
          id: string
          item_id: string
          numero_contrato: string | null
          origem: string
          parcela: number | null
          parcelas_restantes: number | null
        }
        Insert: {
          banco?: string | null
          conferencia_id: string
          created_at?: string
          id?: string
          item_id: string
          numero_contrato?: string | null
          origem?: string
          parcela?: number | null
          parcelas_restantes?: number | null
        }
        Update: {
          banco?: string | null
          conferencia_id?: string
          created_at?: string
          id?: string
          item_id?: string
          numero_contrato?: string | null
          origem?: string
          parcela?: number | null
          parcelas_restantes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_emprestimos_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "conferencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencia_emprestimos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "conferencia_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencia_itens: {
        Row: {
          adiant_premio_pdf: number | null
          adiant_premio_planilha: number | null
          bancos_esocial: Json | null
          base_inss: number | null
          comissao_pdf: number | null
          comissao_planilha: number | null
          conferencia_id: string
          cpf: string | null
          created_at: string
          divergencias: Json | null
          emprestimos_esocial_qtd: number | null
          emprestimos_pdf: number | null
          gratificacao_nps_pdf: number | null
          gratificacao_nps_planilha: number | null
          gratificacao_pdf: number | null
          gratificacao_planilha: number | null
          id: string
          matricula: string | null
          nome: string
          outros_beneficios: Json | null
          plano_saude: number | null
          premio_pdf: number | null
          premio_planilha: number | null
          salario_base: number | null
          setor: string | null
          status: string
          vale_refeicao: number | null
          vale_transporte: number | null
          valor_fgts: number | null
        }
        Insert: {
          adiant_premio_pdf?: number | null
          adiant_premio_planilha?: number | null
          bancos_esocial?: Json | null
          base_inss?: number | null
          comissao_pdf?: number | null
          comissao_planilha?: number | null
          conferencia_id: string
          cpf?: string | null
          created_at?: string
          divergencias?: Json | null
          emprestimos_esocial_qtd?: number | null
          emprestimos_pdf?: number | null
          gratificacao_nps_pdf?: number | null
          gratificacao_nps_planilha?: number | null
          gratificacao_pdf?: number | null
          gratificacao_planilha?: number | null
          id?: string
          matricula?: string | null
          nome: string
          outros_beneficios?: Json | null
          plano_saude?: number | null
          premio_pdf?: number | null
          premio_planilha?: number | null
          salario_base?: number | null
          setor?: string | null
          status?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
          valor_fgts?: number | null
        }
        Update: {
          adiant_premio_pdf?: number | null
          adiant_premio_planilha?: number | null
          bancos_esocial?: Json | null
          base_inss?: number | null
          comissao_pdf?: number | null
          comissao_planilha?: number | null
          conferencia_id?: string
          cpf?: string | null
          created_at?: string
          divergencias?: Json | null
          emprestimos_esocial_qtd?: number | null
          emprestimos_pdf?: number | null
          gratificacao_nps_pdf?: number | null
          gratificacao_nps_planilha?: number | null
          gratificacao_pdf?: number | null
          gratificacao_planilha?: number | null
          id?: string
          matricula?: string | null
          nome?: string
          outros_beneficios?: Json | null
          plano_saude?: number | null
          premio_pdf?: number | null
          premio_planilha?: number | null
          salario_base?: number | null
          setor?: string | null
          status?: string
          vale_refeicao?: number | null
          vale_transporte?: number | null
          valor_fgts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_itens_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "conferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencias: {
        Row: {
          cnpj: string | null
          competencia: string
          created_at: string
          empresa: string | null
          esocial_nome: string | null
          id: string
          observacoes: string | null
          pdf_nome: string | null
          planilhas_nomes: string[] | null
          total_comissao_pdf: number | null
          total_comissao_planilha: number | null
          total_divergencias: number
          total_funcionarios: number
          total_gratificacao_pdf: number | null
          total_gratificacao_planilha: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          competencia: string
          created_at?: string
          empresa?: string | null
          esocial_nome?: string | null
          id?: string
          observacoes?: string | null
          pdf_nome?: string | null
          planilhas_nomes?: string[] | null
          total_comissao_pdf?: number | null
          total_comissao_planilha?: number | null
          total_divergencias?: number
          total_funcionarios?: number
          total_gratificacao_pdf?: number | null
          total_gratificacao_planilha?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          competencia?: string
          created_at?: string
          empresa?: string | null
          esocial_nome?: string | null
          id?: string
          observacoes?: string | null
          pdf_nome?: string | null
          planilhas_nomes?: string[] | null
          total_comissao_pdf?: number | null
          total_comissao_planilha?: number | null
          total_divergencias?: number
          total_funcionarios?: number
          total_gratificacao_pdf?: number | null
          total_gratificacao_planilha?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
