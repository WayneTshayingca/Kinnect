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
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          family_id: string
          id: string
          location: string | null
          start_time: string
          title: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          family_id: string
          id?: string
          location?: string | null
          start_time: string
          title: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          family_id?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string | null
          id: string
          name: string
          primary_language: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          primary_language?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          primary_language?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          family_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          joined_at?: string
          role?: string
          user_id?: string
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
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_by: string | null
          assigned_shopper: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          list_id: string
          notes: string | null
          position: number
          quantity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          assigned_shopper?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          list_id: string
          notes?: string | null
          position?: number
          quantity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          assigned_shopper?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          list_id?: string
          notes?: string | null
          position?: number
          quantity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_assigned_shopper_fkey"
            columns: ["assigned_shopper"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string[] | null
          category: string | null
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          family_id: string | null
          id: string
          points: number | null
          title: string
        }
        Insert: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          family_id?: string | null
          id?: string
          points?: number | null
          title: string
        }
        Update: {
          assigned_to?: string[] | null
          category?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          family_id?: string | null
          id?: string
          points?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_family_id: string | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          family_id: string | null
          id: string
          language_preference: string | null
          name: string
          phone: string | null
          points: number | null
          push_token: string | null
          role: string | null
        }
        Insert: {
          active_family_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          language_preference?: string | null
          name: string
          phone?: string | null
          points?: number | null
          push_token?: string | null
          role?: string | null
        }
        Update: {
          active_family_id?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          language_preference?: string | null
          name?: string
          phone?: string | null
          points?: number | null
          push_token?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_active_family_id_fkey"
            columns: ["active_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_family_with_user: {
        Args: {
          auth_uid: string
          family_name: string
          primary_lang?: string
          user_name: string
        }
        Returns: string
      }
      get_my_families: {
        Args: never
        Returns: {
          family_id: string
          family_name: string
          is_active: boolean
          role: string
        }[]
      }
      get_my_family_id: { Args: never; Returns: string }
      switch_active_family: {
        Args: { target_family_id: string }
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

// ── Named row types ───────────────────────────────────────────────
export type User         = Tables<'users'>
export type Family       = Tables<'families'>
export type FamilyMember = Tables<'family_members'>
export type Task         = Tables<'tasks'>
export type CalendarEvent = Tables<'calendar_events'>
export type List         = Tables<'lists'>
export type ListItem     = Tables<'list_items'>

// ── Insert helpers ────────────────────────────────────────────────
export type UserInsert         = TablesInsert<'users'>
export type FamilyInsert       = TablesInsert<'families'>
export type FamilyMemberInsert = TablesInsert<'family_members'>
export type TaskInsert         = TablesInsert<'tasks'>
export type CalendarEventInsert = TablesInsert<'calendar_events'>
export type ListInsert         = TablesInsert<'lists'>
export type ListItemInsert     = TablesInsert<'list_items'>

// ── Update helpers ────────────────────────────────────────────────
export type UserUpdate         = TablesUpdate<'users'>
export type FamilyUpdate       = TablesUpdate<'families'>
export type FamilyMemberUpdate = TablesUpdate<'family_members'>
export type TaskUpdate         = TablesUpdate<'tasks'>
export type CalendarEventUpdate = TablesUpdate<'calendar_events'>
export type ListUpdate         = TablesUpdate<'lists'>
export type ListItemUpdate     = TablesUpdate<'list_items'>

// ── RPC return type ───────────────────────────────────────────────
export type MyFamily = {
  family_id: string
  family_name: string
  role: string
  is_active: boolean
}
