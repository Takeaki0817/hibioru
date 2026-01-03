// Supabase データベース型定義
// 自動生成: `pnpm supabase gen types typescript` で更新可能

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          display_name?: string
          avatar_url?: string | null
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
          content: string
          image_urls: string[] | null
          is_public: boolean
          is_shared: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_urls?: string[] | null
          is_public?: boolean
          is_shared?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          image_urls?: string[] | null
          is_public?: boolean
          is_shared?: boolean
          is_deleted?: boolean
          updated_at?: string
        }
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_entry_date: string | null
          hotsure_remaining: number
          hotsure_used_dates: string[]
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_entry_date?: string | null
          hotsure_remaining?: number
          hotsure_used_dates?: string[]
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_entry_date?: string | null
          hotsure_remaining?: number
          hotsure_used_dates?: string[]
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
        }
      }
      notification_settings: {
        Row: {
          user_id: string
          enabled: boolean
          chase_reminder_enabled: boolean
          chase_reminder_delay_minutes: number
        }
        Insert: {
          user_id: string
          enabled?: boolean
          chase_reminder_enabled?: boolean
          chase_reminder_delay_minutes?: number
        }
        Update: {
          enabled?: boolean
          chase_reminder_enabled?: boolean
          chase_reminder_delay_minutes?: number
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// 便利な型エイリアス
export type User = Database['public']['Tables']['users']['Row']
export type Entry = Database['public']['Tables']['entries']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type EntryInsert = Database['public']['Tables']['entries']['Insert']
export type StreakInsert = Database['public']['Tables']['streaks']['Insert']

export type UserUpdate = Database['public']['Tables']['users']['Update']
export type EntryUpdate = Database['public']['Tables']['entries']['Update']
export type StreakUpdate = Database['public']['Tables']['streaks']['Update']
