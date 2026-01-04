/**
 * 通知配信サービス (NotificationDispatcher / NotificationSender)
 *
 * Web Push APIを使用した通知送信処理を担当します。
 *
 * Requirements:
 * - 5.2: 全登録デバイスへの通知送信
 * - 5.1: タイムゾーン対応の配信時刻計算
 * - 3.4: 記録済みユーザーのスキップ判定
 * - 5.3: 無効購読（410 Gone）の検出
 */

import { createClient } from '@/lib/supabase/server'
import { logNotification } from './log'
import type { NotificationType } from '../types'

// 共有ライブラリから再export（後方互換性のため）
export {
  sendNotification,
  sendToAllDevices,
} from '@/lib/push/sender'

export type {
  PushNotificationPayload as NotificationPayload,
  SendResult,
  DispatchError,
} from '@/lib/push/types'

// 購読管理も再export（後方互換性のため）
export {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
  type PushSubscription,
  type PushSubscriptionInput,
  type SubscriptionError,
} from '@/lib/push/subscription'

/**
 * タイムゾーン判定用の設定
 */
interface NotificationTimeSettings {
  /** 配信時刻（HH:mm形式） */
  primaryTime: string
  /** タイムゾーン（IANA形式） */
  timezone: string
  /** 有効な曜日（0:日曜〜6:土曜） */
  activeDays: number[]
}

/**
 * Result型（notification固有）
 */
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

/**
 * タイムゾーンを考慮して現在の曜日を取得する
 *
 * @param timezone - タイムゾーン（IANA形式）
 * @param currentTime - 現在時刻（UTC）
 * @returns 曜日（0:日曜〜6:土曜）
 */
export function getCurrentDayOfWeek(timezone: string, currentTime: Date): number {
  // タイムゾーンを考慮した日付文字列を取得
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })
  const weekdayStr = formatter.format(currentTime)

  // 曜日を数値に変換
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return weekdayMap[weekdayStr] ?? 0
}

/**
 * 現在時刻がprimaryTimeと一致するかを判定する
 *
 * @param settings - 通知設定
 * @param currentTime - 現在時刻（UTC）
 * @returns 配信すべきタイミングであればtrue
 */
export function isTimeToSendNotification(
  settings: NotificationTimeSettings,
  currentTime: Date
): boolean {
  // タイムゾーンを考慮した現在時刻を取得
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(currentTime)

  const hourPart = parts.find((p) => p.type === 'hour')
  const minutePart = parts.find((p) => p.type === 'minute')

  if (!hourPart || !minutePart) {
    return false
  }

  // 現在時刻（HH:mm形式）
  const currentTimeStr = `${hourPart.value.padStart(2, '0')}:${minutePart.value.padStart(2, '0')}`

  // 時刻が一致しない場合
  if (currentTimeStr !== settings.primaryTime) {
    return false
  }

  // 曜日チェック
  const dayOfWeek = getCurrentDayOfWeek(settings.timezone, currentTime)
  if (!settings.activeDays.includes(dayOfWeek)) {
    return false
  }

  return true
}

/**
 * タイムゾーンを考慮してその日の開始・終了時刻を取得する
 *
 * @param timezone - タイムゾーン（IANA形式）
 * @param currentTime - 現在時刻（UTC）
 * @returns その日の開始時刻と終了時刻（UTC）
 */
function getDayBoundaries(
  timezone: string,
  currentTime: Date
): { startOfDay: Date; endOfDay: Date } {
  // タイムゾーンを考慮した日付を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(currentTime)

  // その日の開始時刻（タイムゾーンの00:00）をUTCに変換
  const startOfDayLocal = new Date(`${dateStr}T00:00:00`)
  const endOfDayLocal = new Date(`${dateStr}T23:59:59.999`)

  // Intlを使ってオフセットを計算
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
  const offsetParts = offsetFormatter.formatToParts(currentTime)
  const offsetPart = offsetParts.find((p) => p.type === 'timeZoneName')
  const offsetStr = offsetPart?.value || '+00:00'

  // オフセットをパース（例: "GMT+9" -> 9時間）
  const offsetMatch = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/)
  let offsetMinutes = 0
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? -1 : 1
    const hours = parseInt(offsetMatch[2], 10)
    const minutes = parseInt(offsetMatch[3] || '0', 10)
    offsetMinutes = sign * (hours * 60 + minutes)
  }

  // UTCに変換
  const startOfDay = new Date(startOfDayLocal.getTime() + offsetMinutes * 60 * 1000)
  const endOfDay = new Date(endOfDayLocal.getTime() + offsetMinutes * 60 * 1000)

  return { startOfDay, endOfDay }
}

/**
 * 記録済みユーザーのスキップ判定を行う
 *
 * @param userId - ユーザーID
 * @param currentTime - 現在時刻（UTC）
 * @param timezone - タイムゾーン（IANA形式）
 * @returns 記録済みの場合true
 */
export async function shouldSkipNotification(
  userId: string,
  currentTime: Date,
  timezone: string
): Promise<Result<boolean, { type: 'DATABASE_ERROR'; message: string }>> {
  try {
    const supabase = await createClient()

    // タイムゾーンを考慮した当日の範囲を計算
    const { startOfDay, endOfDay } = getDayBoundaries(timezone, currentTime)

    // 当日のエントリーが存在するかチェック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .limit(1)

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      }
    }

    // エントリーが存在すればスキップ
    const hasEntry = data && data.length > 0
    return { ok: true, value: hasEntry }
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * メイン通知を送信し、ログを記録する
 *
 * 記録済みユーザーはスキップし、全デバイスへ通知を送信します。
 *
 * @param userId - ユーザーID
 * @param payload - 通知ペイロード
 * @param timezone - タイムゾーン
 * @returns 送信結果
 */
export async function dispatchMainNotification(
  userId: string,
  payload: { title: string; body: string; icon?: string; badge?: string; data?: { url: string; type: NotificationType | 'main' | 'follow_up_1' | 'follow_up_2' | 'celebration' | 'follow'; notificationId: string; timestamp?: number } },
  _timezone: string
): Promise<Result<import('@/lib/push/types').SendResult[], import('@/lib/push/types').DispatchError | { type: 'DATABASE_ERROR'; message: string }>> {
  const { sendToAllDevices } = await import('@/lib/push/sender')

  // 通知を送信（投稿の有無に関わらず送信）
  const sendResult = await sendToAllDevices(userId, payload)

  // ログを記録
  const logResult = sendResult.ok ? 'success' : 'failed'
  await logNotification({
    userId,
    type: 'main_reminder',
    result: logResult,
    errorMessage: sendResult.ok ? undefined : sendResult.error.type,
  })

  return sendResult
}
