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
      audit_log: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facturas_ledger: {
        Row: {
          id: string
          organization_id: string
          concepto: string
          monto: number
          destinatario_id: string | null
          detalle: Json | null
          estado_pago: string
          periodo: string
          fecha: string
          factura_mensual_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          concepto: string
          monto: number
          destinatario_id?: string | null
          detalle?: Json | null
          estado_pago?: string
          periodo: string
          fecha?: string
          factura_mensual_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          concepto?: string
          monto?: number
          destinatario_id?: string | null
          detalle?: Json | null
          estado_pago?: string
          periodo?: string
          fecha?: string
          factura_mensual_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_ledger_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "me_interesa_destinatarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_ledger_factura_mensual_id_fkey"
            columns: ["factura_mensual_id"]
            isOneToOne: false
            referencedRelation: "facturas_mensuales"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_mensuales: {
        Row: {
          id: string
          organization_id: string
          periodo: string
          monto_total: number
          fecha_limite_pago: string
          estado: string
          tarifas_snapshot: Json | null
          reportado_at: string | null
          confirmado_at: string | null
          confirmado_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          periodo: string
          monto_total?: number
          fecha_limite_pago: string
          estado?: string
          tarifas_snapshot?: Json | null
          reportado_at?: string | null
          confirmado_at?: string | null
          confirmado_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          periodo?: string
          monto_total?: number
          fecha_limite_pago?: string
          estado?: string
          tarifas_snapshot?: Json | null
          reportado_at?: string | null
          confirmado_at?: string | null
          confirmado_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_mensuales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_mensuales_confirmado_by_fkey"
            columns: ["confirmado_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_bancos: {
        Row: { id: string; clave: string; label: string; tipo_tarifa: string; valor: number; updated_at: string }
        Insert: { id: string; clave: string; label: string; tipo_tarifa: string; valor: number; updated_at?: string }
        Update: { id?: string; clave?: string; label?: string; tipo_tarifa?: string; valor?: number; updated_at?: string }
        Relationships: []
      }
      planes_comercio: {
        Row: { id: string; clave: string; label: string; cpl: number; comision_pct: number; updated_at: string }
        Insert: { id: string; clave: string; label: string; cpl: number; comision_pct: number; updated_at?: string }
        Update: { id?: string; clave?: string; label?: string; cpl?: number; comision_pct?: number; updated_at?: string }
        Relationships: []
      }
      tarifas_bancos_por_organizacion: {
        Row: {
          id: string
          banco_organization_id: string
          clave: string
          tipo_tarifa: string
          valor: number
          periodo_vigente_desde: string
          updated_at: string
        }
        Insert: {
          id?: string
          banco_organization_id: string
          clave: string
          tipo_tarifa: string
          valor: number
          periodo_vigente_desde: string
          updated_at?: string
        }
        Update: {
          id?: string
          banco_organization_id?: string
          clave?: string
          tipo_tarifa?: string
          valor?: number
          periodo_vigente_desde?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_bancos_por_organizacion_banco_organization_id_fkey"
            columns: ["banco_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      me_interesa_solicitudes: {
        Row: {
          id: string
          cliente_id: string
          origen: string
          estado: string
          producto_bancario: string | null
          tipo_vivienda: string | null
          comuna: string | null
          ciudad: string | null
          estrato_min: number | null
          estrato_max: number | null
          presupuesto_min: number | null
          presupuesto_max: number | null
          financiacion_solicitada: boolean
          categoria: string | null
          subcategoria: string | null
          created_at: string
        }
        Insert: {
          id: string
          cliente_id: string
          origen: string
          estado?: string
          producto_bancario?: string | null
          tipo_vivienda?: string | null
          comuna?: string | null
          ciudad?: string | null
          estrato_min?: number | null
          estrato_max?: number | null
          presupuesto_min?: number | null
          presupuesto_max?: number | null
          financiacion_solicitada?: boolean
          categoria?: string | null
          subcategoria?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          origen?: string
          estado?: string
          producto_bancario?: string | null
          tipo_vivienda?: string | null
          comuna?: string | null
          ciudad?: string | null
          estrato_min?: number | null
          estrato_max?: number | null
          presupuesto_min?: number | null
          presupuesto_max?: number | null
          financiacion_solicitada?: boolean
          categoria?: string | null
          subcategoria?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "me_interesa_solicitudes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      me_interesa_destinatarios: {
        Row: {
          id: string
          solicitud_id: string
          organization_id: string
          destinatario_type: string
          contactado: boolean
          contactado_at: string | null
          estado_pipeline: string
          proxima_gestion_at: string | null
          monto_cierre: number | null
          franquicia_tarjeta: string | null
          created_at: string
        }
        Insert: {
          id: string
          solicitud_id: string
          organization_id: string
          destinatario_type: string
          contactado?: boolean
          contactado_at?: string | null
          estado_pipeline?: string
          proxima_gestion_at?: string | null
          monto_cierre?: number | null
          franquicia_tarjeta?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          solicitud_id?: string
          organization_id?: string
          destinatario_type?: string
          contactado?: boolean
          contactado_at?: string | null
          estado_pipeline?: string
          proxima_gestion_at?: string | null
          monto_cierre?: number | null
          franquicia_tarjeta?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "me_interesa_destinatarios_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "me_interesa_solicitudes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_interesa_destinatarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios_curados: {
        Row: {
          id: string
          sector: string
          nombre: string
          ciudad: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sector: string
          nombre: string
          ciudad?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sector?: string
          nombre?: string
          ciudad?: string | null
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      senales_interes: {
        Row: {
          id: string
          cliente_id: string
          cliente_nombre: string
          cliente_telefono: string
          sector: string
          negocio_deseado: string | null
          producto_bancario: string | null
          tipo_vivienda: string | null
          categoria: string | null
          subcategoria: string | null
          ciudad: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          cliente_nombre: string
          cliente_telefono: string
          sector: string
          negocio_deseado?: string | null
          producto_bancario?: string | null
          tipo_vivienda?: string | null
          categoria?: string | null
          subcategoria?: string | null
          ciudad?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          cliente_nombre?: string
          cliente_telefono?: string
          sector?: string
          negocio_deseado?: string
          producto_bancario?: string | null
          tipo_vivienda?: string | null
          categoria?: string | null
          subcategoria?: string | null
          ciudad?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "senales_interes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_banco_productos: {
        Row: {
          id: string
          cliente_id: string
          organization_id: string
          producto: string
          created_at: string
        }
        Insert: {
          id: string
          cliente_id: string
          organization_id: string
          producto: string
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          organization_id?: string
          producto?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_banco_productos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_banco_productos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ahorro_mensual: number
          categoria: string
          cliente_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          ifc_activo: boolean
          metadata: Json | null
          monto_ahorrado: number
          monto_objetivo: number
          status: string
          subcategoria: string | null
        }
        Insert: {
          ahorro_mensual?: number
          categoria: string
          cliente_id?: string | null
          completed_at?: string | null
          created_at?: string
          id: string
          ifc_activo?: boolean
          metadata?: Json | null
          monto_ahorrado?: number
          monto_objetivo?: number
          status?: string
          subcategoria?: string | null
        }
        Update: {
          ahorro_mensual?: number
          categoria?: string
          cliente_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          ifc_activo?: boolean
          metadata?: Json | null
          monto_ahorrado?: number
          monto_objetivo?: number
          status?: string
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
          estado: string
          facturacion_automatica: boolean
          gancho_comercial: string | null
          id: string
          meta_id: string | null
          motivo_rechazo: string | null
          oportunidad_id: string | null
          respondida_at: string | null
          terminos: string | null
        }
        Insert: {
          beneficio?: string | null
          comercio_id?: string | null
          comercio_nombre?: string | null
          comercio_ref?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          facturacion_automatica?: boolean
          gancho_comercial?: string | null
          id: string
          meta_id?: string | null
          motivo_rechazo?: string | null
          oportunidad_id?: string | null
          respondida_at?: string | null
          terminos?: string | null
        }
        Update: {
          beneficio?: string | null
          comercio_id?: string | null
          comercio_nombre?: string | null
          comercio_ref?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: string
          facturacion_automatica?: boolean
          gancho_comercial?: string | null
          id?: string
          meta_id?: string | null
          motivo_rechazo?: string | null
          oportunidad_id?: string | null
          respondida_at?: string | null
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
      organizations: {
        Row: {
          ciudad: string | null
          created_at: string
          email: string | null
          has_trust_seal: boolean
          id: string
          metadata: Json | null
          name: string
          nit: string | null
          plan_negociacion: string | null
          representante_legal: string | null
          status: string
          telefono: string | null
          type: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          email?: string | null
          has_trust_seal?: boolean
          id: string
          metadata?: Json | null
          name: string
          nit?: string | null
          plan_negociacion?: string | null
          representante_legal?: string | null
          status?: string
          telefono?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          email?: string | null
          has_trust_seal?: boolean
          id?: string
          metadata?: Json | null
          name?: string
          nit?: string | null
          plan_negociacion?: string | null
          representante_legal?: string | null
          status?: string
          telefono?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          bono_comercial: string | null
          ciudad: string | null
          comuna: string | null
          constructora_id: string | null
          constructora_nombre: string | null
          cpl_costo: number
          created_at: string
          cuota_inicial_pct: number
          estado: string
          estrato_max: number | null
          estrato_min: number | null
          id: string
          modo_lanzamiento: boolean
          nombre: string
          plazo_cuota_inicial_meses: number
          precio_max: number
          precio_min: number
          success_fee_pct: number
          tipo_vivienda: string | null
          unidades: number
          unidades_lanzamiento: number
          valor_separacion: number
        }
        Insert: {
          bono_comercial?: string | null
          ciudad?: string | null
          comuna?: string | null
          constructora_id?: string | null
          constructora_nombre?: string | null
          cpl_costo?: number
          created_at?: string
          cuota_inicial_pct?: number
          estado?: string
          estrato_max?: number | null
          estrato_min?: number | null
          id: string
          modo_lanzamiento?: boolean
          nombre: string
          plazo_cuota_inicial_meses?: number
          precio_max?: number
          precio_min?: number
          success_fee_pct?: number
          tipo_vivienda?: string | null
          unidades?: number
          unidades_lanzamiento?: number
          valor_separacion?: number
        }
        Update: {
          bono_comercial?: string | null
          ciudad?: string | null
          comuna?: string | null
          constructora_id?: string | null
          constructora_nombre?: string | null
          cpl_costo?: number
          created_at?: string
          cuota_inicial_pct?: number
          estado?: string
          estrato_max?: number | null
          estrato_min?: number | null
          id?: string
          modo_lanzamiento?: boolean
          nombre?: string
          plazo_cuota_inicial_meses?: number
          precio_max?: number
          precio_min?: number
          success_fee_pct?: number
          tipo_vivienda?: string | null
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
          avatar_url: string | null
          ciudad: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          nit: string | null
          nombre: string
          numero_documento: string | null
          preferences: Json | null
          rango_ingresos: string | null
          representante_legal: string | null
          rol: string
          score_estimado: number | null
          status: string | null
          telefono: string | null
          tipo_documento: string | null
          tipo_entidad: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          ciudad?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          nit?: string | null
          nombre: string
          numero_documento?: string | null
          preferences?: Json | null
          rango_ingresos?: string | null
          representante_legal?: string | null
          rol: string
          score_estimado?: number | null
          status?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          tipo_entidad?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          ciudad?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          nit?: string | null
          nombre?: string
          numero_documento?: string | null
          preferences?: Json | null
          rango_ingresos?: string | null
          representante_legal?: string | null
          rol?: string
          score_estimado?: number | null
          status?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          tipo_entidad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      facturas_resumen_por_negocio: {
        Row: {
          organization_id: string
          organization_name: string
          organization_type: string
          cantidad_cargos: number
          total_pendiente: number
          total_facturado: number
          total_pagado: number
        }
        Relationships: []
      }
      facturas_totales_globales: {
        Row: {
          total_cpl: number
          total_success_fee: number
          total_facturado: number
          total_pendiente: number
        }
        Relationships: []
      }
    }
    Functions: {
      resolve_organization_ids_for_users: {
        Args: { p_user_ids: string[] }
        Returns: { user_id: string; organization_id: string }[]
      }
      registrar_cargo_cpl: {
        Args: { p_destinatario_id: string }
        Returns: undefined
      }
      registrar_cierre_lead: {
        Args: { p_destinatario_id: string; p_monto_cierre: number; p_franquicia_tarjeta: string | null }
        Returns: undefined
      }
      reportar_pago_factura: {
        Args: { p_factura_id: string }
        Returns: undefined
      }
      confirmar_pago_factura: {
        Args: { p_factura_id: string }
        Returns: undefined
      }
      fetch_oportunidades_comercio: {
        Args: { p_categoria: string }
        Returns: {
          meta_id: string
          subcategoria: string | null
          monto_objetivo: number
          monto_ahorrado: number
          ahorro_mensual: number
          created_at: string
        }[]
      }
      responder_oferta_comercio: {
        Args: { p_oferta_id: string; p_estado: string; p_motivo_rechazo?: string | null }
        Returns: undefined
      }
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
