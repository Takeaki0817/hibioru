/**
 * 通知配信サービス
 *
 * Web Push APIを使用した通知送信処理を担当します。
 * notification feature と social feature の両方から使用されます。
 */

import webpush from 'web-push'
import type { Result } from '@/lib/types/result'
import type {
  PushNotificationPayload,
  SendResult,
  DispatchError,
  PushSubscriptionInfo,
} from './types'
import { getSubscriptions, removeInvalidSubscription } from './subscription'

/**
 * VAPID設定
 */
interface VapidConfig {
  publicKey: string | undefined
  privateKey: string | undefined
}

// VAPID詳細の設定（初回のみ）
let vapidConfigured = false

/**
 * VAPID設定を取得する
 */
function getVapidConfig(): VapidConfig {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  }
}

/**
 * VAPID設定をバリデーションする
 */
function validateVapidConfig(
  config: VapidConfig
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.publicKey || config.publicKey.trim() === '') {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
  }

  if (!config.privateKey || config.privateKey.trim() === '') {
    errors.push('VAPID_PRIVATE_KEY is not set')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * VAPID設定を初期化する
 */
function ensureVapidConfigured(): Result<void, DispatchError> {
  if (vapidConfigured) {
    return { ok: true, value: undefined }
  }

  const config = getVapidConfig()
  const validation = validateVapidConfig(config)

  if (!validation.isValid) {
    return {
      ok: false,
      error: {
        type: 'VAPID_ERROR',
        message: validation.errors.join(', '),
      },
    }
  }

  webpush.setVapidDetails(
    'mailto:support@hibioru.app',
    config.publicKey!,
    config.privateKey!
  )

  vapidConfigured = true
  return { ok: true, value: undefined }
}

/**
 * 単一デバイスへ通知を送信する
 *
 * @param subscription - 購読情報
 * @param payload - 通知ペイロード
 * @returns 送信結果
 */
export async function sendNotification(
  subscription: PushSubscriptionInfo,
  payload: PushNotificationPayload
): Promise<Result<SendResult, DispatchError>> {
  // VAPID設定の確認
  const vapidResult = ensureVapidConfigured()
  if (!vapidResult.ok) {
    return vapidResult
  }

  // web-push用の購読オブジェクトを構築
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  }

  try {
    const response = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )

    return {
      ok: true,
      value: {
        subscriptionId: subscription.id,
        success: true,
        statusCode: response.statusCode,
      },
    }
  } catch (error: unknown) {
    // エラーオブジェクトの型を確認
    const webPushError = error as {
      statusCode?: number
      body?: string
      message?: string
    }
    const statusCode = webPushError.statusCode

    // 410 Gone: 購読が無効（削除が必要）
    if (statusCode === 410) {
      return {
        ok: true,
        value: {
          subscriptionId: subscription.id,
          success: false,
          statusCode: 410,
          error: 'Subscription has expired or is no longer valid',
          shouldRemove: true,
        },
      }
    }

    // その他のエラー
    const errorMessage =
      webPushError.message || webPushError.body || 'Unknown error'

    return {
      ok: true,
      value: {
        subscriptionId: subscription.id,
        success: false,
        statusCode,
        error: errorMessage,
      },
    }
  }
}

/**
 * ユーザーの全登録デバイスへ通知を送信する
 *
 * @param userId - ユーザーID
 * @param payload - 通知ペイロード
 * @returns 全デバイスへの送信結果
 */
export async function sendToAllDevices(
  userId: string,
  payload: PushNotificationPayload
): Promise<Result<SendResult[], DispatchError>> {
  // 購読情報を取得
  const subscriptionsResult = await getSubscriptions(userId)
  if (!subscriptionsResult.ok) {
    return {
      ok: false,
      error: {
        type: 'VAPID_ERROR',
        message: 'Failed to get subscriptions',
      },
    }
  }

  const subscriptions = subscriptionsResult.value

  // 購読情報がない場合
  if (subscriptions.length === 0) {
    return {
      ok: false,
      error: { type: 'NO_SUBSCRIPTIONS' },
    }
  }

  // 全デバイスへ送信
  const results: SendResult[] = []
  const removePromises: Promise<unknown>[] = []

  for (const subscription of subscriptions) {
    const sendResult = await sendNotification(subscription, payload)

    if (sendResult.ok) {
      results.push(sendResult.value)

      // 無効な購読は削除
      if (sendResult.value.shouldRemove) {
        removePromises.push(removeInvalidSubscription(subscription.id, '410 Gone'))
      }
    } else {
      // VAPID設定エラーなどの場合
      results.push({
        subscriptionId: subscription.id,
        success: false,
        error: 'VAPID configuration error',
      })
    }
  }

  // 無効な購読の削除を待機
  if (removePromises.length > 0) {
    await Promise.all(removePromises)
  }

  // 全て失敗した場合
  const hasSuccess = results.some((r) => r.success)
  if (!hasSuccess) {
    return {
      ok: false,
      error: {
        type: 'ALL_FAILED',
        results,
      },
    }
  }

  return { ok: true, value: results }
}
