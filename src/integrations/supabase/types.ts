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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          details: Json | null
          id: string
          performed_at: string
          target_id_code: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          details?: Json | null
          id?: string
          performed_at?: string
          target_id_code?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          details?: Json | null
          id?: string
          performed_at?: string
          target_id_code?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          admin_avatar: string | null
          admin_id: string
          admin_name: string
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          admin_avatar?: string | null
          admin_id: string
          admin_name?: string
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          admin_avatar?: string | null
          admin_id?: string
          admin_name?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      approved_ids: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          member_id: string
          status: Database["public"]["Enums"]["approved_id_status"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["approved_id_status"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["approved_id_status"]
          updated_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      c4_games: {
        Row: {
          board: string[]
          created_at: string
          current_turn: string
          id: string
          player_red: string
          player_yellow: string
          status: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_red: string
          player_yellow: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_red?: string
          player_yellow?: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disappearing_settings: {
        Row: {
          chat_id: string
          chat_type: string
          duration_seconds: number
          enabled: boolean
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          chat_type?: string
          duration_seconds?: number
          enabled?: boolean
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          chat_type?: string
          duration_seconds?: number
          enabled?: boolean
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          created_at: string
          from_user: string
          game_id: string | null
          game_type: string
          id: string
          status: string
          to_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user: string
          game_id?: string | null
          game_type?: string
          id?: string
          status?: string
          to_user: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user?: string
          game_id?: string | null
          game_type?: string
          id?: string
          status?: string
          to_user?: string
          updated_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          board: string[]
          created_at: string
          current_turn: string
          id: string
          player_o: string
          player_x: string
          status: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_o: string
          player_x: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_o?: string
          player_x?: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string | null
          deleted_for_everyone: boolean | null
          edited_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          reply_to: Json | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          edited_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          reply_to?: Json | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          edited_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          reply_to?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          ownerless: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          ownerless?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          ownerless?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          message_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          message_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          deleted_for_everyone: boolean | null
          edited_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          receiver_id: string
          reply_to: Json | null
          sender_id: string
          status: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          edited_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          receiver_id: string
          reply_to?: Json | null
          sender_id: string
          status?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          deleted_for_everyone?: boolean | null
          edited_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          receiver_id?: string
          reply_to?: Json | null
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bubble_radius: string | null
          chat_theme: Json | null
          created_at: string | null
          disabled: boolean
          display_name: string
          gender: string | null
          id: string
          is_online: boolean | null
          last_seen: string | null
          member_id: string | null
          readable_id: string | null
          user_number: number
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bubble_radius?: string | null
          chat_theme?: Json | null
          created_at?: string | null
          disabled?: boolean
          display_name: string
          gender?: string | null
          id: string
          is_online?: boolean | null
          last_seen?: string | null
          member_id?: string | null
          readable_id?: string | null
          user_number?: number
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bubble_radius?: string | null
          chat_theme?: Json | null
          created_at?: string | null
          disabled?: boolean
          display_name?: string
          gender?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          member_id?: string | null
          readable_id?: string | null
          user_number?: number
          username?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string | null
          id: string
          media_type: string | null
          media_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          added_by: string
          created_at: string
          id: string
          position: number
          url: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          position?: number
          url: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          position?: number
          url?: string
        }
        Relationships: []
      }
      starred_messages: {
        Row: {
          chat_id: string
          created_at: string | null
          id: string
          message_id: string
          message_type: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          id?: string
          message_id: string
          message_type?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          id?: string
          message_id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: []
      }
      status_views: {
        Row: {
          id: string
          status_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          status_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          status_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_views_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      used_usernames: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          username: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          username: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_add_approved_ids: {
        Args: { _member_ids: string[] }
        Returns: {
          member_id: string
          message: string
          success: boolean
        }[]
      }
      admin_assign_username: {
        Args: { _new_username: string; _target_user_id: string }
        Returns: undefined
      }
      admin_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_force_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_generate_approved_ids: {
        Args: { _count: number; _prefix: string; _start: number }
        Returns: number
      }
      admin_list_all_groups: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          created_by: string
          description: string
          id: string
          member_count: number
          name: string
          owner_username: string
          ownerless: boolean
        }[]
      }
      admin_list_group_members: {
        Args: { _group_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          is_owner: boolean
          joined_at: string
          role: string
          user_id: string
          username: string
        }[]
      }
      admin_list_user_groups: {
        Args: { _target_user_id: string }
        Returns: {
          group_id: string
          is_owner: boolean
          member_count: number
          name: string
          role: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          community_count: number
          created_at: string
          disabled: boolean
          display_name: string
          email: string
          id: string
          is_online: boolean
          last_seen: string
          member_id: string
          username: string
        }[]
      }
      admin_remove_from_group: {
        Args: { _group_id: string; _target_user_id: string }
        Returns: undefined
      }
      admin_set_approved_id_status: {
        Args: {
          _member_id: string
          _status: Database["public"]["Enums"]["approved_id_status"]
        }
        Returns: undefined
      }
      check_member_id: { Args: { _member_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_default_group: { Args: { _group_id: string }; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "reel_manager"
      approved_id_status: "available" | "claimed" | "disabled"
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
      app_role: ["admin", "user", "reel_manager"],
      approved_id_status: ["available", "claimed", "disabled"],
    },
  },
} as const
