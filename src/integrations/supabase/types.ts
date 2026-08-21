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
    PostgrestVersion: "14.15"
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
      bulletin_bishopric: {
        Row: {
          created_at: string
          id: string
          meeting_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulletin_bishopric_announcements: {
        Row: {
          bishopric_id: string
          content: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          bishopric_id: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          bishopric_id?: string
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_bishopric_announcements_bishopric_id_fkey"
            columns: ["bishopric_id"]
            isOneToOne: false
            referencedRelation: "bulletin_bishopric"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_notices: {
        Row: {
          address_text: string
          arrival_note_text: string
          created_at: string
          id: string
          image_url: string | null
          meeting_date: string
          scripture_text: string
          updated_at: string
        }
        Insert: {
          address_text?: string
          arrival_note_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          meeting_date: string
          scripture_text?: string
          updated_at?: string
        }
        Update: {
          address_text?: string
          arrival_note_text?: string
          created_at?: string
          id?: string
          image_url?: string | null
          meeting_date?: string
          scripture_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulletin_notice_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          notice_id: string
          sort_order: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          notice_id: string
          sort_order?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          notice_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_notice_announcements_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "bulletin_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_ward_business: {
        Row: {
          bishopric_id: string
          category: string
          created_at: string
          custom_name: string | null
          id: string
          member_id: string | null
          note: string
          sort_order: number
        }
        Insert: {
          bishopric_id: string
          category: string
          created_at?: string
          custom_name?: string | null
          id?: string
          member_id?: string | null
          note?: string
          sort_order?: number
        }
        Update: {
          bishopric_id?: string
          category?: string
          created_at?: string
          custom_name?: string | null
          id?: string
          member_id?: string | null
          note?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_ward_business_bishopric_id_fkey"
            columns: ["bishopric_id"]
            isOneToOne: false
            referencedRelation: "bulletin_bishopric"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_ward_business_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cleaning_schedule: {
        Row: {
          clean_date: string
          created_at: string
          id: string
          note: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          clean_date: string
          created_at?: string
          id?: string
          note?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          clean_date?: string
          created_at?: string
          id?: string
          note?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_schedule_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          display_name_override: string | null
          head_member_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name_override?: string | null
          head_member_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name_override?: string | null
          head_member_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_head_member_id_fkey"
            columns: ["head_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          family_role: Database["public"]["Enums"]["family_role"]
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          family_role?: Database["public"]["Enums"]["family_role"]
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          family_role?: Database["public"]["Enums"]["family_role"]
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      full_time_missionaries: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          sort_order?: number
          type?: string
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
      member_relations: {
        Row: {
          created_at: string
          id: string
          member_id: string
          related_member_id: string
          relation_type: Database["public"]["Enums"]["family_relation_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          related_member_id: string
          relation_type: Database["public"]["Enums"]["family_relation_type"]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          related_member_id?: string
          relation_type?: Database["public"]["Enums"]["family_relation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "member_relations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_relations_related_member_id_fkey"
            columns: ["related_member_id"]
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
          is_non_member: boolean
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
          is_non_member?: boolean
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
          is_non_member?: boolean
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
      recommend_interviews: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          interview_type: string | null
          member_id: string | null
          notes: string | null
          recommend_id: string
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_type?: string | null
          member_id?: string | null
          notes?: string | null
          recommend_id: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_type?: string | null
          member_id?: string | null
          notes?: string | null
          recommend_id?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommend_interviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommend_interviews_recommend_id_fkey"
            columns: ["recommend_id"]
            isOneToOne: false
            referencedRelation: "temple_recommends"
            referencedColumns: ["id"]
          },
        ]
      }
      sacrament_assignments: {
        Row: {
          created_at: string
          custom_name: string | null
          hymn_number: string | null
          id: string
          meeting_id: string
          member_id: string | null
          role: string
          slot: number
          status: string | null
          talk_content: string | null
          talk_topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          hymn_number?: string | null
          id?: string
          meeting_id: string
          member_id?: string | null
          role: string
          slot?: number
          status?: string | null
          talk_content?: string | null
          talk_topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          hymn_number?: string | null
          id?: string
          meeting_id?: string
          member_id?: string | null
          role?: string
          slot?: number
          status?: string | null
          talk_content?: string | null
          talk_topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sacrament_assignments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "sacrament_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sacrament_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      sacrament_meetings: {
        Row: {
          created_at: string
          event_custom_name: string | null
          event_type: string
          id: string
          meeting_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_custom_name?: string | null
          event_type?: string
          id?: string
          meeting_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_custom_name?: string | null
          event_type?: string
          id?: string
          meeting_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_assignments: {
        Row: {
          assigned_at: string
          assigned_method: Database["public"]["Enums"]["team_assign_method"]
          family_id: string
          id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_method?: Database["public"]["Enums"]["team_assign_method"]
          family_id: string
          id?: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          assigned_method?: Database["public"]["Enums"]["team_assign_method"]
          family_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string
          id: string
          is_fixed: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_fixed?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_fixed?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      temple_recommends: {
        Row: {
          age_at_import: number | null
          created_at: string
          expiry_month: string | null
          gender: string | null
          id: string
          last_imported_at: string
          lcr_name: string
          lcr_status_raw: string | null
          member_id: string | null
          recommend_type: string
          updated_at: string
        }
        Insert: {
          age_at_import?: number | null
          created_at?: string
          expiry_month?: string | null
          gender?: string | null
          id?: string
          last_imported_at?: string
          lcr_name: string
          lcr_status_raw?: string | null
          member_id?: string | null
          recommend_type: string
          updated_at?: string
        }
        Update: {
          age_at_import?: number | null
          created_at?: string
          expiry_month?: string | null
          gender?: string | null
          id?: string
          last_imported_at?: string
          lcr_name?: string
          lcr_status_raw?: string | null
          member_id?: string | null
          recommend_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_recommends_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reverse_relation_type: {
        Args: { t: Database["public"]["Enums"]["family_relation_type"] }
        Returns: Database["public"]["Enums"]["family_relation_type"]
      }
    }
    Enums: {
      family_relation_type: "spouse" | "parent" | "child" | "sibling"
      family_role: "head" | "spouse" | "child" | "single"
      team_assign_method: "auto" | "manual"
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
      family_relation_type: ["spouse", "parent", "child", "sibling"],
      family_role: ["head", "spouse", "child", "single"],
      team_assign_method: ["auto", "manual"],
    },
  },
} as const
