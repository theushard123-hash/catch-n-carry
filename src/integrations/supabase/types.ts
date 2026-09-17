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
      app_settings: {
        Row: {
          company_name: string
          contact_email: string
          hero_image_url: string
          hero_subtitle: string
          hero_title: string
          id: number
          logo_url: string
          min_order_atacado: number
          min_order_varejo: number
          notice: string
          require_approval: boolean
          updated_at: string
          whatsapp: string
        }
        Insert: {
          company_name?: string
          contact_email?: string
          hero_image_url?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          logo_url?: string
          min_order_atacado?: number
          min_order_varejo?: number
          notice?: string
          require_approval?: boolean
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          hero_image_url?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          logo_url?: string
          min_order_atacado?: number
          min_order_varejo?: number
          notice?: string
          require_approval?: boolean
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          qty: number
          sku: string | null
          total: number
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          qty: number
          sku?: string | null
          total: number
          unit?: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          sku?: string | null
          total?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          delivery_date: string | null
          external_id: string | null
          id: string
          notes: string
          order_number: number
          payment_condition_id: string | null
          payment_condition_name: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string
          created_at?: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          delivery_date?: string | null
          external_id?: string | null
          id?: string
          notes?: string
          order_number?: never
          payment_condition_id?: string | null
          payment_condition_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          delivery_date?: string | null
          external_id?: string | null
          id?: string
          notes?: string
          order_number?: never
          payment_condition_id?: string | null
          payment_condition_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_condition_id_fkey"
            columns: ["payment_condition_id"]
            isOneToOne: false
            referencedRelation: "payment_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_conditions: {
        Row: {
          active: boolean
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          description: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          description?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          description?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          min_qty: number
          name: string
          price_atacado: number
          price_varejo: number
          sku: string | null
          sort_order: number
          step_qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name: string
          price_atacado?: number
          price_varejo?: number
          sku?: string | null
          sort_order?: number
          step_qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name?: string
          price_atacado?: number
          price_varejo?: number
          sku?: string | null
          sort_order?: number
          step_qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string
          admin_notes: string | null
          approved: boolean
          city: string
          company_name: string
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          document: string
          email: string | null
          external_code: string | null
          full_name: string
          id: string
          phone: string
          state: string
          state_registration: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address?: string
          admin_notes?: string | null
          approved?: boolean
          city?: string
          company_name?: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          document?: string
          email?: string | null
          external_code?: string | null
          full_name?: string
          id?: string
          phone?: string
          state?: string
          state_registration?: string
          updated_at?: string
          user_id: string
          zip?: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          approved?: boolean
          city?: string
          company_name?: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          document?: string
          email?: string | null
          external_code?: string | null
          full_name?: string
          id?: string
          phone?: string
          state?: string
          state_registration?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      customer_type: "atacado" | "varejo"
      order_status: "pendente" | "aprovado" | "faturado" | "cancelado"
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
    Enums: {
      app_role: ["admin", "user"],
      customer_type: ["atacado", "varejo"],
      order_status: ["pendente", "aprovado", "faturado", "cancelado"],
    },
  },
} as const
