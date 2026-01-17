'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.generated'
import type { Result } from '@/lib/types/result'
import type { NotificationSettings } from '../types'
import { DEFAULT_REMINDERS } from '../types'

export interface NotificationError {
  code: 'DB_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED'
  message: string
}

/**
 * 通知設定を取得（存在しない場合はデフォルト値を返す）
 */
export async function getNotificationSettings(
  userId: string
): Promise<Result<NotificationSettings, NotificationError>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_settings')
      .select()
      .eq('user_id', userId)
      .single()

    if (error) {
      // レコードが存在しない場合はデフォルト値を返す
      if (error.code === 'PGRST116') {
        return {
          ok: true,
          value: {
            user_id: userId,
            enabled: false,  // デフォルトはfalse
            reminders: DEFAULT_REMINDERS,
            chase_reminder_enabled: true,
            chase_reminder_delay_minutes: 60,
            follow_up_max_count: 2,
            social_notifications_enabled: true,
          }
        }
      }

      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    // remindersがない古いデータの場合はデフォルト値を付与
    const settings = data as unknown as NotificationSettings
    if (!settings.reminders || !Array.isArray(settings.reminders)) {
      settings.reminders = DEFAULT_REMINDERS
    } else {
      // 5つ未満の場合はデフォルトで埋める
      while (settings.reminders.length < 5) {
        settings.reminders.push({ time: null, enabled: false })
      }
    }

    return { ok: true, value: settings }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}

/**
 * 通知設定を更新（存在しない場合は作成）
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<Omit<NotificationSettings, 'user_id'>>
): Promise<Result<NotificationSettings, NotificationError>> {
  try {
    const supabase = await createClient()

    // upsert（存在すれば更新、なければ挿入）
    // settingsの型（reminders: Reminder[]）とDBの型（reminders: Json）が異なるため、
    // TablesInsert型として明示的にキャストする
    type NotificationSettingsInsert = {
      user_id: string
      enabled?: boolean
      reminders?: unknown // Json型として扱う
      chase_reminder_enabled?: boolean
      chase_reminder_delay_minutes?: number
      follow_up_max_count?: number
      social_notifications_enabled?: boolean
    }

    const upsertData: NotificationSettingsInsert = {
      user_id: userId,
      ...settings,
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(upsertData as Database['public']['Tables']['notification_settings']['Insert'])
      .select()
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    // DBのJson型からアプリケーションの型に変換
    const result: NotificationSettings = {
      user_id: data.user_id,
      enabled: data.enabled,
      reminders: data.reminders as unknown as NotificationSettings['reminders'],
      chase_reminder_enabled: data.chase_reminder_enabled,
      chase_reminder_delay_minutes: data.chase_reminder_delay_minutes,
      follow_up_max_count: data.follow_up_max_count,
      social_notifications_enabled: data.social_notifications_enabled,
    }

    return { ok: true, value: result }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}
