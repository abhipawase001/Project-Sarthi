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
      anomalies: {
        Row: {
          ai_explanation: string | null
          bus_id: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          message: string
          severity: string
          status: string
          type: string
        }
        Insert: {
          ai_explanation?: string | null
          bus_id: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message: string
          severity?: string
          status?: string
          type: string
        }
        Update: {
          ai_explanation?: string | null
          bus_id?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message?: string
          severity?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      bus_pings: {
        Row: {
          bus_id: string
          created_at: string
          heading: number
          id: string
          lat: number
          lng: number
          occupancy: string
          route: string
          speed: number
        }
        Insert: {
          bus_id: string
          created_at?: string
          heading?: number
          id?: string
          lat: number
          lng: number
          occupancy?: string
          route: string
          speed?: number
        }
        Update: {
          bus_id?: string
          created_at?: string
          heading?: number
          id?: string
          lat?: number
          lng?: number
          occupancy?: string
          route?: string
          speed?: number
        }
        Relationships: []
      }
      buses: {
        Row: {
          capacity: number
          created_at: string
          fuel_type: string
          health_score: number
          last_service_at: string | null
          next_service_km: number | null
          odometer_km: number
          reg_no: string
          route: string | null
          status: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          fuel_type?: string
          health_score?: number
          last_service_at?: string | null
          next_service_km?: number | null
          odometer_km?: number
          reg_no: string
          route?: string | null
          status?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          fuel_type?: string
          health_score?: number
          last_service_at?: string | null
          next_service_km?: number | null
          odometer_km?: number
          reg_no?: string
          route?: string | null
          status?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          license_expiry: string | null
          license_no: string | null
          name: string
          phone: string | null
          rating: number
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          name: string
          phone?: string | null
          rating?: number
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          name?: string
          phone?: string | null
          rating?: number
          role?: string
          status?: string
        }
        Relationships: []
      }
      fuel_logs: {
        Row: {
          bus_reg: string
          cost: number | null
          id: string
          liters: number
          odometer_km: number | null
          refueled_at: string
        }
        Insert: {
          bus_reg: string
          cost?: number | null
          id?: string
          liters: number
          odometer_km?: number | null
          refueled_at?: string
        }
        Update: {
          bus_reg?: string
          cost?: number | null
          id?: string
          liters?: number
          odometer_km?: number | null
          refueled_at?: string
        }
        Relationships: []
      }
      incident_reports: {
        Row: {
          bus_id: string | null
          created_at: string
          id: string
          kind: string
          lat: number | null
          lng: number | null
          message: string | null
          status: string
          stop_id: string | null
        }
        Insert: {
          bus_id?: string | null
          created_at?: string
          id?: string
          kind: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          status?: string
          stop_id?: string | null
        }
        Update: {
          bus_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          status?: string
          stop_id?: string | null
        }
        Relationships: []
      }
      roster: {
        Row: {
          bus_reg: string | null
          conductor_id: string | null
          created_at: string
          driver_id: string | null
          duty_date: string
          id: string
          notes: string | null
          route: string | null
          shift_end: string
          shift_start: string
          status: string
        }
        Insert: {
          bus_reg?: string | null
          conductor_id?: string | null
          created_at?: string
          driver_id?: string | null
          duty_date?: string
          id?: string
          notes?: string | null
          route?: string | null
          shift_end: string
          shift_start: string
          status?: string
        }
        Update: {
          bus_reg?: string | null
          conductor_id?: string | null
          created_at?: string
          driver_id?: string | null
          duty_date?: string
          id?: string
          notes?: string | null
          route?: string | null
          shift_end?: string
          shift_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_bus_reg_fkey"
            columns: ["bus_reg"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["reg_no"]
          },
          {
            foreignKeyName: "roster_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "public_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_logs: {
        Row: {
          bus_reg: string
          id: string
          kind: string
          next_due_km: number | null
          notes: string | null
          serviced_at: string
        }
        Insert: {
          bus_reg: string
          id?: string
          kind: string
          next_due_km?: number | null
          notes?: string | null
          serviced_at?: string
        }
        Update: {
          bus_reg?: string
          id?: string
          kind?: string
          next_due_km?: number | null
          notes?: string | null
          serviced_at?: string
        }
        Relationships: []
      }
      trip_logs: {
        Row: {
          bus_reg: string | null
          distance_km: number | null
          driver_id: string | null
          ended_at: string | null
          fuel_liters: number | null
          id: string
          passengers_est: number | null
          route: string | null
          started_at: string
        }
        Insert: {
          bus_reg?: string | null
          distance_km?: number | null
          driver_id?: string | null
          ended_at?: string | null
          fuel_liters?: number | null
          id?: string
          passengers_est?: number | null
          route?: string | null
          started_at?: string
        }
        Update: {
          bus_reg?: string | null
          distance_km?: number | null
          driver_id?: string | null
          ended_at?: string | null
          fuel_liters?: number | null
          id?: string
          passengers_est?: number | null
          route?: string | null
          started_at?: string
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
      public_drivers: {
        Row: {
          id: string | null
          name: string | null
          rating: number | null
          role: string | null
          status: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          rating?: number | null
          role?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          rating?: number | null
          role?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "dispatcher" | "viewer"
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
      app_role: ["admin", "dispatcher", "viewer"],
    },
  },
} as const
