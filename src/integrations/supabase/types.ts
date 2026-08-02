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
      companies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_available: boolean
          name: string
          notes: string | null
          owner_id: string
          quantity: number
          serial_number: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          notes?: string | null
          owner_id: string
          quantity?: number
          serial_number?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          quantity?: number
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_owner_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_unavailability: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          owner_id: string
          reason: string | null
          unavailable_on: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          owner_id: string
          reason?: string | null
          unavailable_on: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          owner_id?: string
          reason?: string | null
          unavailable_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_unavailability_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          kit_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          kit_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          kit_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_unavailability: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          reason: string | null
          unavailable_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          reason?: string | null
          unavailable_on: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
          unavailable_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_unavailability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_offline: boolean
          managed_by: string | null
          phone: string | null
          role_title: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_offline?: boolean
          managed_by?: string | null
          phone?: string | null
          role_title?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_offline?: boolean
          managed_by?: string | null
          phone?: string | null
          role_title?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_day_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          owner_id: string
          quantity: number
          shoot_day_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          owner_id: string
          quantity?: number
          shoot_day_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          owner_id?: string
          quantity?: number
          shoot_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_day_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoot_day_equipment_owner_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoot_day_equipment_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_day_members: {
        Row: {
          created_at: string
          id: string
          shoot_day_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shoot_day_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shoot_day_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_day_members_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoot_day_members_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_day_requests: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          id: string
          is_resolved: boolean
          label: string
          shoot_day_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          id?: string
          is_resolved?: boolean
          label: string
          shoot_day_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          is_resolved?: boolean
          label?: string
          shoot_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_day_requests_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_days: {
        Row: {
          call_time: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          project_id: string
          shoot_date: string
          title: string | null
        }
        Insert: {
          call_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id: string
          shoot_date: string
          title?: string | null
        }
        Update: {
          call_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string
          shoot_date?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shoot_days_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      equipment_conflicts_on: {
        Args: { _date: string; _ids: string[] }
        Returns: {
          day_title: string
          equipment_id: string
          project_name: string
          shoot_day_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user: string }; Returns: boolean }
      manages_profile: {
        Args: { _profile: string; _user: string }
        Returns: boolean
      }
      project_company: { Args: { _project: string }; Returns: string }
      shares_company: { Args: { _a: string; _b: string }; Returns: boolean }
      shoot_day_company: { Args: { _day: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin"
      company_role: "admin" | "member"
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
      app_role: ["super_admin"],
      company_role: ["admin", "member"],
    },
  },
} as const
