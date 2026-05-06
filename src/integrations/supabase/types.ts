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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          event_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          event_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          event_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          is_present: boolean
          member_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          id?: string
          is_present?: boolean
          member_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          is_present?: boolean
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_visitors: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          attendees: string | null
          category: string
          content: string
          created_at: string
          id: string
          meeting_date: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          meeting_date: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          meeting_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_church_info: {
        Row: {
          baptism_date: string | null
          bishop_interview_date: string | null
          created_at: string
          current_calling: string[] | null
          id: string
          member_id: string
          ministry_target: string | null
          missionary_work: string | null
          previous_callings: string | null
          priesthood: string | null
          record_number: string | null
          stake_president_interview_date: string | null
          sunday_school_class: string | null
          temple_recommend: boolean | null
          updated_at: string
        }
        Insert: {
          baptism_date?: string | null
          bishop_interview_date?: string | null
          created_at?: string
          current_calling?: string[] | null
          id?: string
          member_id: string
          ministry_target?: string | null
          missionary_work?: string | null
          previous_callings?: string | null
          priesthood?: string | null
          record_number?: string | null
          stake_president_interview_date?: string | null
          sunday_school_class?: string | null
          temple_recommend?: boolean | null
          updated_at?: string
        }
        Update: {
          baptism_date?: string | null
          bishop_interview_date?: string | null
          created_at?: string
          current_calling?: string[] | null
          id?: string
          member_id?: string
          ministry_target?: string | null
          missionary_work?: string | null
          previous_callings?: string | null
          priesthood?: string | null
          record_number?: string | null
          stake_president_interview_date?: string | null
          sunday_school_class?: string | null
          temple_recommend?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_church_info_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_family: {
        Row: {
          created_at: string
          id: string
          member_id: string
          name: string | null
          notes: string | null
          phone: string | null
          relationship: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_family_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author: string | null
          content: string
          created_at: string
          id: string
          member_id: string
          note_date: string
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string
          id?: string
          member_id: string
          note_date: string
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          note_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_special_care: boolean
          marital_status: string | null
          marriage_date: string | null
          name: string
          notes: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_special_care?: boolean
          marital_status?: string | null
          marriage_date?: string | null
          name: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_special_care?: boolean
          marital_status?: string | null
          marriage_date?: string | null
          name?: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      org_positions: {
        Row: {
          calling_keyword: string | null
          created_at: string
          id: string
          role: string
          section: string
          sort_order: number | null
        }
        Insert: {
          calling_keyword?: string | null
          created_at?: string
          id?: string
          role: string
          section: string
          sort_order?: number | null
        }
        Update: {
          calling_keyword?: string | null
          created_at?: string
          id?: string
          role?: string
          section?: string
          sort_order?: number | null
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
