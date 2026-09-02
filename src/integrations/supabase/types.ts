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
      activity_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          challenged_id: string
          challenger_id: string
          created_at: string
          duration_days: number
          ends_at: string | null
          group_id: string | null
          id: string
          reward_xp: number
          starts_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenged_id: string
          challenger_id: string
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          group_id?: string | null
          id?: string
          reward_xp?: number
          starts_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          group_id?: string | null
          id?: string
          reward_xp?: number
          starts_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_challenges: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          group_id: string
          id: string
          starts_at: string
          target_points: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          group_id: string
          id?: string
          starts_at?: string
          target_points: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          group_id?: string
          id?: string
          starts_at?: string
          target_points?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
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
        ]
      }
      groups: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          created_at: string
          goal: string | null
          id: string
          last_task_date: string | null
          level: number
          pseudo: string
          streak: number
          total_points: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar?: string
          created_at?: string
          goal?: string | null
          id: string
          last_task_date?: string | null
          level?: number
          pseudo: string
          streak?: number
          total_points?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar?: string
          created_at?: string
          goal?: string | null
          id?: string
          last_task_date?: string | null
          level?: number
          pseudo?: string
          streak?: number
          total_points?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          points: number
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id?: string
          points: number
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          points?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done: boolean
          done_at: string | null
          id: string
          points: number
          task_date: string
          template_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done?: boolean
          done_at?: string | null
          id?: string
          points: number
          task_date?: string
          template_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          done?: boolean
          done_at?: string | null
          id?: string
          points?: number
          task_date?: string
          template_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_duel: {
        Args: { _duel: string }
        Returns: {
          challenged_id: string
          challenger_id: string
          created_at: string
          duration_days: number
          ends_at: string | null
          group_id: string | null
          id: string
          reward_xp: number
          starts_at: string | null
          status: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "duels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_friend_request: {
        Args: { _request: string }
        Returns: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "friend_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_duel: {
        Args: { _duel: string }
        Returns: {
          challenged_id: string
          challenger_id: string
          created_at: string
          duration_days: number
          ends_at: string | null
          group_id: string | null
          id: string
          reward_xp: number
          starts_at: string | null
          status: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "duels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_task: {
        Args: { _task_id: string }
        Returns: {
          level: number
          streak: number
          total_points: number
          xp: number
        }[]
      }
      create_duel: {
        Args: { _challenged: string; _duration_days?: number; _group?: string }
        Returns: {
          challenged_id: string
          challenger_id: string
          created_at: string
          duration_days: number
          ends_at: string | null
          group_id: string | null
          id: string
          reward_xp: number
          starts_at: string | null
          status: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "duels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_group: {
        Args: { _name: string }
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_group_code: { Args: never; Returns: string }
      group_activity: {
        Args: { _group: string; _limit?: number }
        Returns: {
          avatar: string
          done_at: string
          id: string
          points: number
          pseudo: string
          reactions: Json
          title: string
          user_id: string
        }[]
      }
      group_challenge_progress: {
        Args: { _challenge: string }
        Returns: number
      }
      group_duels: {
        Args: { _group: string }
        Returns: {
          challenged_avatar: string
          challenged_id: string
          challenged_points: number
          challenged_pseudo: string
          challenger_avatar: string
          challenger_id: string
          challenger_points: number
          challenger_pseudo: string
          days_left: number
          duration_days: number
          ends_at: string
          id: string
          reward_xp: number
          starts_at: string
          status: string
          winner_id: string
        }[]
      }
      group_leaderboard: {
        Args: { _group: string }
        Returns: {
          avatar: string
          level: number
          points_month: number
          points_today: number
          points_week: number
          pseudo: string
          streak: number
          total_points: number
          user_id: string
          xp: number
        }[]
      }
      group_member_profile: {
        Args: { _group: string; _user: string }
        Returns: {
          avatar: string
          goal: string
          id: string
          level: number
          points_month: number
          points_today: number
          points_week: number
          pseudo: string
          streak: number
          tasks_done: number
          total_points: number
          xp: number
        }[]
      }
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      join_group: {
        Args: { _code: string }
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_duels: {
        Args: never
        Returns: {
          challenged_avatar: string
          challenged_id: string
          challenged_points: number
          challenged_pseudo: string
          challenger_avatar: string
          challenger_id: string
          challenger_points: number
          challenger_pseudo: string
          days_left: number
          duration_days: number
          ends_at: string
          group_id: string
          id: string
          reward_xp: number
          starts_at: string
          status: string
          winner_id: string
        }[]
      }
      my_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          sender_avatar: string
          sender_id: string
          sender_level: number
          sender_pseudo: string
        }[]
      }
      my_friends: {
        Args: never
        Returns: {
          avatar: string
          id: string
          level: number
          pseudo: string
          streak: number
          total_points: number
          xp: number
        }[]
      }
      reject_friend_request: { Args: { _request: string }; Returns: undefined }
      remove_friend: { Args: { _friend: string }; Returns: undefined }
      resolve_expired_duels: { Args: never; Returns: undefined }
      search_users: {
        Args: { _query: string }
        Returns: {
          avatar: string
          id: string
          is_friend: boolean
          level: number
          pseudo: string
          request_received: boolean
          request_sent: boolean
        }[]
      }
      send_friend_request: {
        Args: { _receiver: string }
        Returns: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "friend_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_today_tasks: {
        Args: never
        Returns: {
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done: boolean
          done_at: string | null
          id: string
          points: number
          task_date: string
          template_id: string | null
          title: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      difficulty: "facile" | "moyenne" | "difficile"
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
      difficulty: ["facile", "moyenne", "difficile"],
    },
  },
} as const
