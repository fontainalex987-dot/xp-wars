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
      app_badge_icons: {
        Row: {
          d: string
          key: string
          source: string
          viewbox: number
        }
        Insert: {
          d: string
          key: string
          source?: string
          viewbox?: number
        }
        Update: {
          d?: string
          key?: string
          source?: string
          viewbox?: number
        }
        Relationships: []
      }
      app_sound_chunks: {
        Row: {
          data: string
          idx: number
          name: string
        }
        Insert: {
          data: string
          idx: number
          name: string
        }
        Update: {
          data?: string
          idx?: number
          name?: string
        }
        Relationships: []
      }
      app_sounds: {
        Row: {
          data_b64: string
          mime: string
          name: string
          updated_at: string
        }
        Insert: {
          data_b64: string
          mime?: string
          name: string
          updated_at?: string
        }
        Update: {
          data_b64?: string
          mime?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_plans: {
        Row: {
          minutes_per_day: number
          plan: Json
          season_goal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          minutes_per_day: number
          plan: Json
          season_goal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          minutes_per_day?: number
          plan?: Json
          season_goal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          emoji: string
          ends_on: string
          group_id: string | null
          id: string
          is_private: boolean
          starts_on: string
          target_count: number
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          emoji?: string
          ends_on: string
          group_id?: string | null
          id?: string
          is_private?: boolean
          starts_on?: string
          target_count: number
          title: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          emoji?: string
          ends_on?: string
          group_id?: string | null
          id?: string
          is_private?: boolean
          starts_on?: string
          target_count?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_challenges: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          group_id: string
          id: string
          reward_granted: boolean
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
          reward_granted?: boolean
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
          reward_granted?: boolean
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
      leaderboard_snapshot: {
        Row: {
          captured_on: string
          group_id: string
          rank: number
          user_id: string
        }
        Insert: {
          captured_on: string
          group_id: string
          rank: number
          user_id: string
        }
        Update: {
          captured_on?: string
          group_id?: string
          rank?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshot_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          enabled: boolean
          type: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          type: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          streak_freezes_available: number
          streak_freezes_week_start: string | null
          timezone: string
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
          streak_freezes_available?: number
          streak_freezes_week_start?: string | null
          timezone?: string
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
          streak_freezes_available?: number
          streak_freezes_week_start?: string | null
          timezone?: string
          total_points?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_recap_views: {
        Row: {
          group_id: string
          season: string
          seen_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          season: string
          seen_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          season?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_recap_views_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_recap_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_resolutions: {
        Row: {
          group_id: string
          resolved_at: string
          season: string
        }
        Insert: {
          group_id: string
          resolved_at?: string
          season: string
        }
        Update: {
          group_id?: string
          resolved_at?: string
          season?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_resolutions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      season_rewards: {
        Row: {
          created_at: string
          group_id: string
          id: string
          points: number
          rank: number
          season: string
          seen_at: string | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          points: number
          rank: number
          season: string
          seen_at?: string | null
          user_id: string
          xp_awarded: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          points?: number
          rank?: number
          season?: string
          seen_at?: string | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_rewards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_freezes: {
        Row: {
          created_at: string
          freeze_date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          freeze_date: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          freeze_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_freezes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          goal_id: string | null
          id: string
          points: number
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          goal_id?: string | null
          id?: string
          points: number
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          goal_id?: string | null
          id?: string
          points?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done: boolean
          done_at: string | null
          goal_id: string | null
          id: string
          points: number
          task_date: string
          template_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done?: boolean
          done_at?: string | null
          goal_id?: string | null
          id?: string
          points: number
          task_date?: string
          template_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          done?: boolean
          done_at?: string | null
          goal_id?: string | null
          id?: string
          points?: number
          task_date?: string
          template_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      apply_streak_freezes: { Args: never; Returns: undefined }
      award_badges: { Args: { _user: string }; Returns: undefined }
      best_streak: { Args: { _user: string }; Returns: number }
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
      consume_coach_quota: { Args: { _limit?: number }; Returns: number }
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
      dispatch_daily_reminders: { Args: never; Returns: undefined }
      dispatch_overtake_alerts: { Args: never; Returns: undefined }
      duel_points: {
        Args: { _ends: string; _starts: string; _user: string }
        Returns: number
      }
      generate_group_code: { Args: never; Returns: string }
      goal_progress: { Args: { _goal: string }; Returns: number }
      goal_rows: {
        Args: { _ids: string[] }
        Returns: {
          completed_at: string
          contributors: Json
          created_at: string
          creator_avatar: string
          creator_pseudo: string
          days_left: number
          emoji: string
          ends_on: string
          group_id: string
          id: string
          progress: number
          starts_on: string
          target_count: number
          title: string
          user_id: string
        }[]
      }
      grant_xp: { Args: { _amount: number; _user: string }; Returns: undefined }
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
      group_challenge_top_contributors: {
        Args: { _challenge: string }
        Returns: {
          avatar: string
          points: number
          pseudo: string
          rank: number
          user_id: string
        }[]
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
      group_goals: {
        Args: { _group: string }
        Returns: {
          completed_at: string
          contributors: Json
          created_at: string
          creator_avatar: string
          creator_pseudo: string
          days_left: number
          emoji: string
          ends_on: string
          group_id: string
          id: string
          progress: number
          starts_on: string
          target_count: number
          title: string
          user_id: string
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
      group_season_podiums: {
        Args: { _group: string }
        Returns: {
          avatar: string
          points: number
          pseudo: string
          rank: number
          season: string
          user_id: string
          xp_awarded: number
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
      mark_season_recap_seen: {
        Args: { _group: string; _season: string }
        Returns: undefined
      }
      mark_season_rewards_seen: {
        Args: { _ids?: string[] }
        Returns: undefined
      }
      member_week_summary: {
        Args: { _user: string }
        Returns: {
          active_days: number
          categories: Json
          points: number
          quests_done: number
        }[]
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
      my_goals: {
        Args: never
        Returns: {
          completed_at: string
          contributors: Json
          created_at: string
          creator_avatar: string
          creator_pseudo: string
          days_left: number
          emoji: string
          ends_on: string
          group_id: string
          id: string
          progress: number
          starts_on: string
          target_count: number
          title: string
          user_id: string
        }[]
      }
      my_pending_season_recaps: { Args: never; Returns: Json }
      my_unseen_season_rewards: {
        Args: never
        Returns: {
          group_id: string
          group_name: string
          id: string
          points: number
          rank: number
          season: string
          xp_awarded: number
        }[]
      }
      normalize_level: {
        Args: { _level: number; _xp: number }
        Returns: Record<string, unknown>
      }
      player_profile: {
        Args: { _user: string }
        Returns: {
          avatar: string
          goal: string
          id: string
          is_friend: boolean
          level: number
          my_points_week: number
          points_week: number
          pseudo: string
          shared_group: string
          streak: number
          total_points: number
          xp: number
        }[]
      }
      push_notify: {
        Args: {
          _body: string
          _title: string
          _type: string
          _url?: string
          _user: string
        }
        Returns: undefined
      }
      reject_friend_request: { Args: { _request: string }; Returns: undefined }
      remove_friend: { Args: { _friend: string }; Returns: undefined }
      resolve_all_group_seasons: { Args: never; Returns: undefined }
      resolve_expired_duels: { Args: never; Returns: undefined }
      resolve_group_challenge: {
        Args: { _challenge: string }
        Returns: undefined
      }
      resolve_group_seasons: { Args: { _group: string }; Returns: undefined }
      resolve_group_seasons_internal: {
        Args: { _group: string }
        Returns: undefined
      }
      safe_tz: { Args: { _tz: string }; Returns: string }
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
      shares_group: { Args: { _a: string; _b: string }; Returns: boolean }
      sync_today_tasks: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          done: boolean
          done_at: string | null
          goal_id: string | null
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
      user_badges_of: {
        Args: { _user: string }
        Returns: {
          badge_id: string
          unlocked_at: string
        }[]
      }
      user_date_at: { Args: { _ts: string; _user: string }; Returns: string }
      user_goals: {
        Args: { _user: string }
        Returns: {
          completed_at: string
          contributors: Json
          created_at: string
          creator_avatar: string
          creator_pseudo: string
          days_left: number
          emoji: string
          ends_on: string
          group_id: string
          id: string
          progress: number
          starts_on: string
          target_count: number
          title: string
          user_id: string
        }[]
      }
      user_stats_by_category: {
        Args: { _from: string; _to: string }
        Returns: {
          category: string
          done_count: number
          points: number
        }[]
      }
      user_stats_daily: {
        Args: { _from: string; _to: string }
        Returns: {
          done_count: number
          points: number
          task_date: string
          total_count: number
        }[]
      }
      user_stats_monthly: {
        Args: { _months?: number }
        Returns: {
          month_start: string
          points: number
        }[]
      }
      user_stats_weekly: {
        Args: { _from: string; _to: string }
        Returns: {
          points: number
          week_start: string
        }[]
      }
      user_today: { Args: { _user: string }; Returns: string }
      user_trophies: {
        Args: { _user: string }
        Returns: {
          group_id: string
          group_name: string
          id: string
          points: number
          rank: number
          season: string
          xp_awarded: number
        }[]
      }
      user_tz: { Args: { _user: string }; Returns: string }
      xp_to_next: { Args: { _level: number }; Returns: number }
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
