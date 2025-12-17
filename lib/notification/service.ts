'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationSettings } from './types'

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

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
            enabled: false,
            main_reminder_time: '21:00',
            chase_reminder_enabled: true,
            chase_reminder_delay_minutes: 60,
          }
        }
      }

      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    return { ok: true, value: data as NotificationSettings }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
      })
      .select()
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    return { ok: true, value: data as NotificationSettings }
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
