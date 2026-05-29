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
      employee_categories: {
        Row: {
          category_id: string
          employee_id: string
          id: string
        }
        Insert: {
          category_id: string
          employee_id: string
          id?: string
        }
        Update: {
          category_id?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_categories_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avg_rating: number
          bio: string | null
          city: string | null
          created_at: string
          id: string
          is_available: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          total_reviews: number
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          avg_rating?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          total_reviews?: number
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          avg_rating?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          total_reviews?: number
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_applications: {
        Row: {
          created_at: string
          employee_id: string
          estimated_arrival_minutes: number | null
          estimated_price: number | null
          id: string
          message: string | null
          request_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          created_at?: string
          employee_id: string
          estimated_arrival_minutes?: number | null
          estimated_price?: number | null
          id?: string
          message?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          created_at?: string
          employee_id?: string
          estimated_arrival_minutes?: number | null
          estimated_price?: number | null
          id?: string
          message?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_history: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: string
          metadata: Json | null
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          metadata?: Json | null
          request_id: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          metadata?: Json | null
          request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_images: {
        Row: {
          created_at: string
          id: string
          request_id: string
          type: Database["public"]["Enums"]["image_type"]
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          type: Database["public"]["Enums"]["image_type"]
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          type?: Database["public"]["Enums"]["image_type"]
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_images_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          employee_id: string
          id: string
          rating: number
          request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          employee_id: string
          id?: string
          rating: number
          request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          employee_id?: string
          id?: string
          rating?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_tr: string | null
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          name_tr: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_tr?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          name_tr?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_tr?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          name_tr?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          auto_assign: boolean
          colors: Json
          commission_rate: number
          currency: string
          default_language: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          max_distance: number
          min_request_amount: number
          site_names: Json
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_assign?: boolean
          colors?: Json
          commission_rate?: number
          currency?: string
          default_language?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          max_distance?: number
          min_request_amount?: number
          site_names?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_assign?: boolean
          colors?: Json
          commission_rate?: number
          currency?: string
          default_language?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          max_distance?: number
          min_request_amount?: number
          site_names?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_settings_private: {
        Row: {
          id: string
          notifications: Json
          security: Json
          smtp: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          notifications?: Json
          security?: Json
          smtp?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          notifications?: Json
          security?: Json
          smtp?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          address: string
          assigned_employee_id: string | null
          category_id: string
          city: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          lat: number | null
          lng: number | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          assigned_employee_id?: string | null
          category_id: string
          city?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          lat?: number | null
          lng?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_employee_id?: string | null
          category_id?: string
          city?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          lat?: number | null
          lng?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
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
      admin_list_providers: {
        Args: never
        Returns: {
          avg_rating: number
          banned_until: string
          city: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          is_available: boolean
          is_verified: boolean
          phone: string
          total_reviews: number
          user_id: string
          years_experience: number
        }[]
      }
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
    }
    Enums: {
      app_role: "customer" | "employee" | "admin"
      application_status: "pending" | "accepted" | "rejected" | "cancelled"
      image_type:
        | "issue_photo"
        | "progress_photo"
        | "completion_proof"
        | "avatar"
      request_status:
        | "pending"
        | "applications_received"
        | "assigned"
        | "on_the_way"
        | "inspection_started"
        | "quotation_provided"
        | "customer_approved_quotation"
        | "work_in_progress"
        | "waiting_customer_response"
        | "completed"
        | "cancelled"
        | "disputed"
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
      app_role: ["customer", "employee", "admin"],
      application_status: ["pending", "accepted", "rejected", "cancelled"],
      image_type: [
        "issue_photo",
        "progress_photo",
        "completion_proof",
        "avatar",
      ],
      request_status: [
        "pending",
        "applications_received",
        "assigned",
        "on_the_way",
        "inspection_started",
        "quotation_provided",
        "customer_approved_quotation",
        "work_in_progress",
        "waiting_customer_response",
        "completed",
        "cancelled",
        "disputed",
      ],
    },
  },
} as const
