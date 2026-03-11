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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      Logistica: {
        Row: {
          alerta_logistica: string | null
          ciudad_destino: string | null
          departamento_destino: string | null
          dias_desde_creacion_hasta_hoy: number | null
          es_retroceso: boolean | null
          estado_actual_orden: string | null
          fecha_actual_col: string | null
          fecha_siguiente_col: string | null
          horas_desde_creacion_hasta_hoy: number | null
          horas_entre_estados: number | null
          orden_anio: number | null
          orden_dia: number | null
          orden_fecha_creacion: string | null
          orden_mes: number | null
          orden_semana: number | null
          order_id: string | null
          paso_del_historial: string | null
          paso_siguiente: string | null
          pct_actualizaciones_bulk: number | null
          period: string | null
          provider_name: string | null
          shippingCompany: string | null
          tipo_actualizacion: string | null
          tramo_logistico: string | null
          ultimo_tramo_alcanzado: string | null
        }
        Insert: {
          alerta_logistica?: string | null
          ciudad_destino?: string | null
          departamento_destino?: string | null
          dias_desde_creacion_hasta_hoy?: number | null
          es_retroceso?: boolean | null
          estado_actual_orden?: string | null
          fecha_actual_col?: string | null
          fecha_siguiente_col?: string | null
          horas_desde_creacion_hasta_hoy?: number | null
          horas_entre_estados?: number | null
          orden_anio?: number | null
          orden_dia?: number | null
          orden_fecha_creacion?: string | null
          orden_mes?: number | null
          orden_semana?: number | null
          order_id?: string | null
          paso_del_historial?: string | null
          paso_siguiente?: string | null
          pct_actualizaciones_bulk?: number | null
          period?: string | null
          provider_name?: string | null
          shippingCompany?: string | null
          tipo_actualizacion?: string | null
          tramo_logistico?: string | null
          ultimo_tramo_alcanzado?: string | null
        }
        Update: {
          alerta_logistica?: string | null
          ciudad_destino?: string | null
          departamento_destino?: string | null
          dias_desde_creacion_hasta_hoy?: number | null
          es_retroceso?: boolean | null
          estado_actual_orden?: string | null
          fecha_actual_col?: string | null
          fecha_siguiente_col?: string | null
          horas_desde_creacion_hasta_hoy?: number | null
          horas_entre_estados?: number | null
          orden_anio?: number | null
          orden_dia?: number | null
          orden_fecha_creacion?: string | null
          orden_mes?: number | null
          orden_semana?: number | null
          order_id?: string | null
          paso_del_historial?: string | null
          paso_siguiente?: string | null
          pct_actualizaciones_bulk?: number | null
          period?: string | null
          provider_name?: string | null
          shippingCompany?: string | null
          tipo_actualizacion?: string | null
          tramo_logistico?: string | null
          ultimo_tramo_alcanzado?: string | null
        }
        Relationships: []
      }
      logistica_eventos: {
        Row: {
          alerta_logistica: string | null
          ciudad_destino: string | null
          created_at: string | null
          departamento_destino: string | null
          dias_desde_creacion: number | null
          dias_logistica_acum: number | null
          dias_marca_acum: number | null
          dias_transp_acum: number | null
          es_retroceso: string | null
          fecha_actual_col: string | null
          fecha_creacion_col: string | null
          fecha_siguiente_col: string | null
          flag_transportadora: string | null
          fue_entregado: number | null
          horas_entre_estados: number | null
          id: number
          lead_time_acido_dias: number | null
          lead_time_ajustado_dias: number | null
          orden_anio: number | null
          orden_dia: number | null
          orden_mes: number | null
          orden_semana: number | null
          order_id: string
          paso_del_historial: string | null
          paso_siguiente: string | null
          period: string | null
          proveedor: string | null
          responsable_atribuible: string | null
          status_acido: string | null
          status_ajustado: string | null
          status_exito: string | null
          tramo_logistico: string | null
          transportadora: string | null
          tuvo_retroceso: number | null
          ultimo_tramo_alcanzado: string | null
        }
        Insert: {
          alerta_logistica?: string | null
          ciudad_destino?: string | null
          created_at?: string | null
          departamento_destino?: string | null
          dias_desde_creacion?: number | null
          dias_logistica_acum?: number | null
          dias_marca_acum?: number | null
          dias_transp_acum?: number | null
          es_retroceso?: string | null
          fecha_actual_col?: string | null
          fecha_creacion_col?: string | null
          fecha_siguiente_col?: string | null
          flag_transportadora?: string | null
          fue_entregado?: number | null
          horas_entre_estados?: number | null
          id?: number
          lead_time_acido_dias?: number | null
          lead_time_ajustado_dias?: number | null
          orden_anio?: number | null
          orden_dia?: number | null
          orden_mes?: number | null
          orden_semana?: number | null
          order_id: string
          paso_del_historial?: string | null
          paso_siguiente?: string | null
          period?: string | null
          proveedor?: string | null
          responsable_atribuible?: string | null
          status_acido?: string | null
          status_ajustado?: string | null
          status_exito?: string | null
          tramo_logistico?: string | null
          transportadora?: string | null
          tuvo_retroceso?: number | null
          ultimo_tramo_alcanzado?: string | null
        }
        Update: {
          alerta_logistica?: string | null
          ciudad_destino?: string | null
          created_at?: string | null
          departamento_destino?: string | null
          dias_desde_creacion?: number | null
          dias_logistica_acum?: number | null
          dias_marca_acum?: number | null
          dias_transp_acum?: number | null
          es_retroceso?: string | null
          fecha_actual_col?: string | null
          fecha_creacion_col?: string | null
          fecha_siguiente_col?: string | null
          flag_transportadora?: string | null
          fue_entregado?: number | null
          horas_entre_estados?: number | null
          id?: number
          lead_time_acido_dias?: number | null
          lead_time_ajustado_dias?: number | null
          orden_anio?: number | null
          orden_dia?: number | null
          orden_mes?: number | null
          orden_semana?: number | null
          order_id?: string
          paso_del_historial?: string | null
          paso_siguiente?: string | null
          period?: string | null
          proveedor?: string | null
          responsable_atribuible?: string | null
          status_acido?: string | null
          status_ajustado?: string | null
          status_exito?: string | null
          tramo_logistico?: string | null
          transportadora?: string | null
          tuvo_retroceso?: number | null
          ultimo_tramo_alcanzado?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      Ventas: {
        Row: {
          address: string | null
          brand_category: string | null
          brand_createdAt: string | null
          brand_description: string | null
          brand_isActive: string | null
          brand_logoUrl: string | null
          brand_name: string | null
          brand_websiteUrl: string | null
          category_autoconsumo_margin: string | null
          category_comisioncreadora_margin: string | null
          category_estrellasapp_margin: string | null
          category_planpuntos_margin: string | null
          category_referido_margin: string | null
          city: string | null
          client_full_name: string | null
          clientEmail: string | null
          clientPhone: string | null
          createdAt: string | null
          Diferencia_de_Margenes: string | null
          estrella_address: string | null
          estrella_cedula: string | null
          estrella_city: string | null
          estrella_createdAt: string | null
          estrella_crmId: string | null
          estrella_earnings: string | null
          estrella_email: string | null
          estrella_full_name: string | null
          estrella_inactivity_months: string | null
          estrella_inactivity_segment: string | null
          estrella_isActive: string | null
          estrella_last_order_date: string | null
          estrella_notificationPreference: string | null
          estrella_order_link_id: string | null
          estrella_phone: string | null
          estrella_referredBy: string | null
          estrella_status: string | null
          estrella_totalPoints: string | null
          estrella_type: string | null
          estrella_walletID: string | null
          estrellasAppRevenue: string | null
          Externalid_dropi: string | null
          Fecha_sin_hora_UTC: string | null
          HoraCOL_createdAt_utc5: string | null
          Incentivo_Autoconsumo_Moneda: string | null
          Incentivo_ComisionCreadora_Moneda: string | null
          Incentivo_EstrellasApp_Moneda: string | null
          Incentivo_PlanPuntos_Moneda: string | null
          Incentivo_Referido_Moneda: string | null
          Margen_Incentivo_Total_Condicional_Moneda: string | null
          Margen_Minimo_Marcas_CategoryKPI: string | null
          Margen_Negociado_Proveedor: string | null
          Margen_Neto_Operativo: string | null
          order_final_status: string | null
          order_id: string | null
          order_quarter_derived: string | null
          order_status_date: string | null
          order_total_client: string | null
          order_total_points: string | null
          period: string | null
          product_category_id: string | null
          product_category_name: string | null
          product_cost_provider: string | null
          product_id: string | null
          product_name: string | null
          product_points: string | null
          product_quantity: string | null
          product_revenue_client: string | null
          Provide_id: string | null
          provider_createdAt: string | null
          provider_email: string | null
          provider_name: string | null
          provider_nit: string | null
          provider_updatedAt: string | null
          rateType: string | null
          referrerId: string | null
          selfPurchase: string | null
          semana_del_anio: string | null
          shippingCompany: string | null
          shippingGuide: string | null
          state: string | null
          total_products_ordered: string | null
          variation_attributes_summary: string | null
          variation_costo_conIVA: string | null
          variation_costo_sinIVA: string | null
          variation_id: string | null
          variation_PVP_sinIVA: string | null
          variation_PVPconIVA: string | null
        }
        Insert: {
          address?: string | null
          brand_category?: string | null
          brand_createdAt?: string | null
          brand_description?: string | null
          brand_isActive?: string | null
          brand_logoUrl?: string | null
          brand_name?: string | null
          brand_websiteUrl?: string | null
          category_autoconsumo_margin?: string | null
          category_comisioncreadora_margin?: string | null
          category_estrellasapp_margin?: string | null
          category_planpuntos_margin?: string | null
          category_referido_margin?: string | null
          city?: string | null
          client_full_name?: string | null
          clientEmail?: string | null
          clientPhone?: string | null
          createdAt?: string | null
          Diferencia_de_Margenes?: string | null
          estrella_address?: string | null
          estrella_cedula?: string | null
          estrella_city?: string | null
          estrella_createdAt?: string | null
          estrella_crmId?: string | null
          estrella_earnings?: string | null
          estrella_email?: string | null
          estrella_full_name?: string | null
          estrella_inactivity_months?: string | null
          estrella_inactivity_segment?: string | null
          estrella_isActive?: string | null
          estrella_last_order_date?: string | null
          estrella_notificationPreference?: string | null
          estrella_order_link_id?: string | null
          estrella_phone?: string | null
          estrella_referredBy?: string | null
          estrella_status?: string | null
          estrella_totalPoints?: string | null
          estrella_type?: string | null
          estrella_walletID?: string | null
          estrellasAppRevenue?: string | null
          Externalid_dropi?: string | null
          Fecha_sin_hora_UTC?: string | null
          HoraCOL_createdAt_utc5?: string | null
          Incentivo_Autoconsumo_Moneda?: string | null
          Incentivo_ComisionCreadora_Moneda?: string | null
          Incentivo_EstrellasApp_Moneda?: string | null
          Incentivo_PlanPuntos_Moneda?: string | null
          Incentivo_Referido_Moneda?: string | null
          Margen_Incentivo_Total_Condicional_Moneda?: string | null
          Margen_Minimo_Marcas_CategoryKPI?: string | null
          Margen_Negociado_Proveedor?: string | null
          Margen_Neto_Operativo?: string | null
          order_final_status?: string | null
          order_id?: string | null
          order_quarter_derived?: string | null
          order_status_date?: string | null
          order_total_client?: string | null
          order_total_points?: string | null
          period?: string | null
          product_category_id?: string | null
          product_category_name?: string | null
          product_cost_provider?: string | null
          product_id?: string | null
          product_name?: string | null
          product_points?: string | null
          product_quantity?: string | null
          product_revenue_client?: string | null
          Provide_id?: string | null
          provider_createdAt?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_nit?: string | null
          provider_updatedAt?: string | null
          rateType?: string | null
          referrerId?: string | null
          selfPurchase?: string | null
          semana_del_anio?: string | null
          shippingCompany?: string | null
          shippingGuide?: string | null
          state?: string | null
          total_products_ordered?: string | null
          variation_attributes_summary?: string | null
          variation_costo_conIVA?: string | null
          variation_costo_sinIVA?: string | null
          variation_id?: string | null
          variation_PVP_sinIVA?: string | null
          variation_PVPconIVA?: string | null
        }
        Update: {
          address?: string | null
          brand_category?: string | null
          brand_createdAt?: string | null
          brand_description?: string | null
          brand_isActive?: string | null
          brand_logoUrl?: string | null
          brand_name?: string | null
          brand_websiteUrl?: string | null
          category_autoconsumo_margin?: string | null
          category_comisioncreadora_margin?: string | null
          category_estrellasapp_margin?: string | null
          category_planpuntos_margin?: string | null
          category_referido_margin?: string | null
          city?: string | null
          client_full_name?: string | null
          clientEmail?: string | null
          clientPhone?: string | null
          createdAt?: string | null
          Diferencia_de_Margenes?: string | null
          estrella_address?: string | null
          estrella_cedula?: string | null
          estrella_city?: string | null
          estrella_createdAt?: string | null
          estrella_crmId?: string | null
          estrella_earnings?: string | null
          estrella_email?: string | null
          estrella_full_name?: string | null
          estrella_inactivity_months?: string | null
          estrella_inactivity_segment?: string | null
          estrella_isActive?: string | null
          estrella_last_order_date?: string | null
          estrella_notificationPreference?: string | null
          estrella_order_link_id?: string | null
          estrella_phone?: string | null
          estrella_referredBy?: string | null
          estrella_status?: string | null
          estrella_totalPoints?: string | null
          estrella_type?: string | null
          estrella_walletID?: string | null
          estrellasAppRevenue?: string | null
          Externalid_dropi?: string | null
          Fecha_sin_hora_UTC?: string | null
          HoraCOL_createdAt_utc5?: string | null
          Incentivo_Autoconsumo_Moneda?: string | null
          Incentivo_ComisionCreadora_Moneda?: string | null
          Incentivo_EstrellasApp_Moneda?: string | null
          Incentivo_PlanPuntos_Moneda?: string | null
          Incentivo_Referido_Moneda?: string | null
          Margen_Incentivo_Total_Condicional_Moneda?: string | null
          Margen_Minimo_Marcas_CategoryKPI?: string | null
          Margen_Negociado_Proveedor?: string | null
          Margen_Neto_Operativo?: string | null
          order_final_status?: string | null
          order_id?: string | null
          order_quarter_derived?: string | null
          order_status_date?: string | null
          order_total_client?: string | null
          order_total_points?: string | null
          period?: string | null
          product_category_id?: string | null
          product_category_name?: string | null
          product_cost_provider?: string | null
          product_id?: string | null
          product_name?: string | null
          product_points?: string | null
          product_quantity?: string | null
          product_revenue_client?: string | null
          Provide_id?: string | null
          provider_createdAt?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_nit?: string | null
          provider_updatedAt?: string | null
          rateType?: string | null
          referrerId?: string | null
          selfPurchase?: string | null
          semana_del_anio?: string | null
          shippingCompany?: string | null
          shippingGuide?: string | null
          state?: string | null
          total_products_ordered?: string | null
          variation_attributes_summary?: string | null
          variation_costo_conIVA?: string | null
          variation_costo_sinIVA?: string | null
          variation_id?: string | null
          variation_PVP_sinIVA?: string | null
          variation_PVPconIVA?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_atribucion: {
        Row: {
          dias_totales: number | null
          pct: number | null
          responsable: string | null
        }
        Relationships: []
      }
      v_kpi_semanal: {
        Row: {
          avg_lead_acido: number | null
          avg_lead_ajustado: number | null
          en_curso: number | null
          entregadas: number | null
          orden_anio: number | null
          orden_mes: number | null
          orden_semana: number | null
          tasa_entrega_pct: number | null
          total_ordenes: number | null
          total_retrocesos: number | null
        }
        Relationships: []
      }
      v_ordenes_riesgo: {
        Row: {
          alerta_logistica: string | null
          ciudad_destino: string | null
          dias_desde_creacion: number | null
          fecha_creacion_col: string | null
          flag_transportadora: string | null
          lead_time_acido_dias: number | null
          nivel_riesgo: string | null
          order_id: string | null
          proveedor: string | null
          transportadora: string | null
          ultimo_tramo_alcanzado: string | null
        }
        Relationships: []
      }
      v_proveedores: {
        Row: {
          avg_dias_culpa_marca: number | null
          avg_lead_acido: number | null
          entregadas: number | null
          proveedor: string | null
          tasa_entrega_pct: number | null
          total_ordenes: number | null
        }
        Relationships: []
      }
      v_transportadoras: {
        Row: {
          avg_lead_acido: number | null
          avg_lead_ajustado: number | null
          entregadas: number | null
          semaforo: string | null
          tasa_exito_pct: number | null
          total_ordenes: number | null
          total_retrocesos: number | null
          transportadora: string | null
        }
        Relationships: []
      }
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
