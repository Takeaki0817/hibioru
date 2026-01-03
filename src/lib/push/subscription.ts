/**
 * 購読管理サービス
 *
 * Web Push購読情報の取得・削除を管理します。
 * notification feature と social feature の両方から使用されます。
 */

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/types/result'
import type { PushSubscriptionInfo } from './types'

/**
 * データベースの購読情報行
 */
interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}


/**
 * 購読情報（フル）
 */
export interface PushSubscription {
  id: string
  userId: string
  endpoint: string
  p256dhKey: string
  authKey: string
  userAgent: string | null
  createdAt: Date
}

/**
 * 購読情報の入力
 */
export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

/**
 * 購読エラーの型
 */
export type SubscriptionError =
  | { type: 'DUPLICATE_ENDPOINT' }
  | { type: 'USER_NOT_FOUND' }
  | { type: 'DATABASE_ERROR'; message: string }

/**
 * 購読情報を登録する
 *
 * @param userId - ユーザーID
 * @param subscription - 購読情報
 * @returns 登録結果
 */
export async function subscribe(
  userId: string,
  subscription: PushSubscriptionInput
): Promise<Result<PushSubscription, SubscriptionError>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: subscription.userAgent,
      })
      .select()
      .single()

    if (error) {
      // PostgreSQLの一意制約違反エラーコード
      if (error.code === '23505') {
        return {
          ok: false,
          error: { type: 'DUPLICATE_ENDPOINT' },
        }
      }

      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      }
    }

    const row = data as PushSubscriptionRow
    return {
      ok: true,
      value: {
        id: row.id,
        userId: row.user_id,
        endpoint: row.endpoint,
        p256dhKey: row.p256dh,
        authKey: row.auth,
        userAgent: row.user_agent ?? null,
        createdAt: new Date(row.created_at),
      },
    }
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
 * 購読情報を解除する
 *
 * @param userId - ユーザーID
 * @param endpoint - エンドポイントURL
 * @returns 削除結果
 */
export async function unsubscribe(
  userId: string,
  endpoint: string
): Promise<Result<void, SubscriptionError>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      }
    }

    // べき等性: 存在しないエンドポイントの削除もエラーにならない
    return { ok: true, value: undefined }
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
 * ユーザーの全購読情報を取得する
 *
 * @param userId - ユーザーID
 * @returns 購読情報の配列
 */
export async function getSubscriptions(
  userId: string
): Promise<Result<PushSubscriptionInfo[], SubscriptionError>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      }
    }

    const subscriptions: PushSubscriptionInfo[] = (
      (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]
    ).map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      p256dhKey: row.p256dh,
      authKey: row.auth,
    }))

    return { ok: true, value: subscriptions }
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
 * 無効な購読情報を削除する（410 Gone対応）
 *
 * @param subscriptionId - 購読ID
 * @param reason - 削除理由（ログ用）
 * @returns 削除結果
 */
export async function removeInvalidSubscription(
  subscriptionId: string,
  _reason?: string
): Promise<Result<void, SubscriptionError>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      }
    }

    // _reason パラメータは将来のログ機能用に保持

    return { ok: true, value: undefined }
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
