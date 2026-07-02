/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
      facturas_ledger: {
        Row: {
          cantidad: number
          concepto: string
          constructora_id: string | null
          constructora_nombre: string
          estado_pago: string
          fecha: string
          id: string
          monto_unitario: number
          periodo: string | null
          total_acumulado: number
        }
        Insert: {
          cantidad?: number
          concepto: string
          constructora_id?: string | null
          constructora_nombre: string
          estado_pago?: string
          fecha?: string
          id: string
          monto_unitario?: number
          periodo?: string | null
          total_acumulado?: number
        }
        Update: {
          cantidad?: number
          concepto?: string
          constructora_id?: string | null
          constructora_nombre?: string
          estado_pago?: string
          fecha?: string
          id?: string
          monto_unitario?: number
          periodo?: string | null
          total_acumulado?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_ledger_constructora_id_fkey"
            columns: ["constructora_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          asesor_asignado: string | null
          canal_contacto: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_ref: string | null
          constructora_id: string | null
          created_at: string
          estado: string
          id: string
          proyecto_id: string | null
          updated_at: string
        }
        Insert: {
          asesor_asignado?: string | null
          canal_contacto?: string | null
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_ref?: string | null
          constructora_id?: string | null
          created_at?: string
          estado?: string
          id: string
          proyecto_id?: string | null
          updated_at?: string
        }
        Update: {
          asesor_asignado?: string | null
          canal_contacto?: string | null
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_ref?: string | null
          constructora_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          proyecto_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_constructora_id_fkey"
            columns: ["constructora_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ahorro_mensual: number
          categoria: string
          cliente_id: string | null
          created_at: string
          id: string
          ifc_activo: boolean
          metadata: Json | null
          monto_ahorrado: number
          monto_objetivo: number
          subcategoria: string | null
        }
        Insert: {
          ahorro_mensual?: number
          categoria: string
          cliente_id?: string | null
          created_at?: string
          id: string
          ifc_activo?: boolean
          metadata?: Json | null
          monto_ahorrado?: number
          monto_objetivo?: number
          subcategoria?: string | null
        }
        Update: {
          ahorro_mensual?: number
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          id?: string
          ifc_activo?: boolean
          metadata?: Json | null
          monto_ahorrado?: number
          monto_objetivo?: number
          subcategoria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_rechazo: {
        Row: {
          entity_name: string
          id: string
          offer_id: string
          product_type: string
          rejected_at: string
          sector: string
          user_age: number
          user_city: string
          user_gender: string
          user_id: string | null
          user_income_range: string
          user_profile_type: string
        }
        Insert: {
          entity_name: string
          id: string
          offer_id: string
          product_type: string
          rejected_at?: string
          sector: string
          user_age?: number
          user_city?: string
          user_gender?: string
          user_id?: string | null
          user_income_range?: string
          user_profile_type?: string
        }
        Update: {
          entity_name?: string
          id?: string
          offer_id?: string
          product_type?: string
          rejected_at?: string
          sector?: string
          user_age?: number
          user_city?: string
          user_gender?: string
          user_id?: string | null
          user_income_range?: string
          user_profile_type?: string
        }
        Relationships: []
      }
      ofertas_comercios: {
        Row: {
          beneficio: string | null
          comercio_id: string | null
          comercio_nombre: string | null
          comercio_ref: string | null
          created_at: string
          descripcion: string | null
          facturacion_automatica: boolean
          gancho_comercial: string | null
          id: string
          meta_id: string | null
          oportunidad_id: string | null
          terminos: string | null
        }
        Insert: {
          beneficio?: string | null
          comercio_id?: string | null
          comercio_nombre?: string | null
          comercio_ref?: string | null
          created_at?: string
          descripcion?: string | null
          facturacion_automatica?: boolean
          gancho_comercial?: string | null
          id: string
          meta_id?: string | null
          oportunidad_id?: string | null
          terminos?: string | null
        }
        Update: {
          beneficio?: string | null
          comercio_id?: string | null
          comercio_nombre?: string | null
          comercio_ref?: string | null
          created_at?: string
          descripcion?: string | null
          facturacion_automatica?: boolean
          gancho_comercial?: string | null
          id?: string
          meta_id?: string | null
          oportunidad_id?: string | null
          terminos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_comercios_comercio_id_fkey"
            columns: ["comercio_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_comercios_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          bono_comercial: string | null
          ciudad: string | null
          constructora_id: string | null
          constructora_nombre: string | null
          cpl_costo: number
          created_at: string
          cuota_inicial_pct: number
          estado: string
          id: string
          modo_lanzamiento: boolean
          nombre: string
          plazo_cuota_inicial_meses: number
          precio_max: number
          precio_min: number
          success_fee_pct: number
          unidades: number
          unidades_lanzamiento: number
          valor_separacion: number
        }
        Insert: {
          bono_comercial?: string | null
          ciudad?: string | null
          constructora_id?: string | null
          constructora_nombre?: string | null
          cpl_costo?: number
          created_at?: string
          cuota_inicial_pct?: number
          estado?: string
          id: string
          modo_lanzamiento?: boolean
          nombre: string
          plazo_cuota_inicial_meses?: number
          precio_max?: number
          precio_min?: number
          success_fee_pct?: number
          unidades?: number
          unidades_lanzamiento?: number
          valor_separacion?: number
        }
        Update: {
          bono_comercial?: string | null
          ciudad?: string | null
          constructora_id?: string | null
          constructora_nombre?: string | null
          cpl_costo?: number
          created_at?: string
          cuota_inicial_pct?: number
          estado?: string
          id?: string
          modo_lanzamiento?: boolean
          nombre?: string
          plazo_cuota_inicial_meses?: number
          precio_max?: number
          precio_min?: number
          success_fee_pct?: number
          unidades?: number
          unidades_lanzamiento?: number
          valor_separacion?: number
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_constructora_id_fkey"
            columns: ["constructora_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_banca: {
        Row: {
          bancos: string[]
          cliente_id: string | null
          created_at: string
          estado: string
          id: string
          producto: string
        }
        Insert: {
          bancos?: string[]
          cliente_id?: string | null
          created_at?: string
          estado?: string
          id: string
          producto: string
        }
        Update: {
          bancos?: string[]
          cliente_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          producto?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_banca_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ciudad: string | null
          created_at: string
          email: string
          id: string
          nombre: string
          rango_ingresos: string | null
          rol: string
          score_estimado: number | null
          telefono: string | null
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          email: string
          id: string
          nombre: string
          rango_ingresos?: string | null
          rol: string
          score_estimado?: number | null
          telefono?: string | null
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rango_ingresos?: string | null
          rol?: string
          score_estimado?: number | null
          telefono?: string | null
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
