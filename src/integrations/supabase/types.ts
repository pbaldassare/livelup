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
      atleta_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          fitness_level: string | null
          goals: string[] | null
          height_cm: number | null
          id: string
          injuries: string[] | null
          status: Database["public"]["Enums"]["atleta_status"]
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          goals?: string[] | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          status?: Database["public"]["Enums"]["atleta_status"]
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          fitness_level?: string | null
          goals?: string[] | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          status?: Database["public"]["Enums"]["atleta_status"]
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          resource_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pt_atleta_connections: {
        Row: {
          accepted_at: string | null
          atleta_user_id: string
          created_at: string
          id: string
          pt_user_id: string
          requested_at: string
          requested_by: string | null
          status: string
          terminated_at: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          atleta_user_id: string
          created_at?: string
          id?: string
          pt_user_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          atleta_user_id?: string
          created_at?: string
          id?: string
          pt_user_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          terminated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pt_profiles: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          currency: string | null
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_discoverable: boolean | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          max_athletes: number | null
          offers_in_person: boolean | null
          offers_online: boolean | null
          specializations: string[] | null
          status: Database["public"]["Enums"]["pt_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_athletes?: number | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["pt_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          currency?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_discoverable?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_athletes?: number | null
          offers_in_person?: boolean | null
          offers_online?: boolean | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["pt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_atleta: { Args: { _user_id: string }; Returns: boolean }
      is_connected_to_pt: {
        Args: { _atleta_user_id: string; _pt_user_id: string }
        Returns: boolean
      }
      is_pt: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "pt" | "atleta"
      atleta_status: "non_collegato" | "collegato" | "premium"
      pt_status:
        | "registrato"
        | "in_attesa_approvazione"
        | "attivo"
        | "sospeso"
        | "premium"
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
    Enums: {
      app_role: ["admin", "pt", "atleta"],
      atleta_status: ["non_collegato", "collegato", "premium"],
      pt_status: [
        "registrato",
        "in_attesa_approvazione",
        "attivo",
        "sospeso",
        "premium",
      ],
    },
  },
} as const
