'use client'

import { useCallback } from 'react'

/**
 * Base64をUint8Arrayに変換（VAPID鍵処理用）
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface UsePushSubscriptionReturn {
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

/**
 * Push通知の購読/解除を行うフック
 */
export function usePushSubscription(): UsePushSubscriptionReturn {
  // Push購読を登録
  const subscribe = useCallback(async (): Promise<boolean> => {
    const registration = await navigator.serviceWorker.ready

    // VAPID公開鍵を取得
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('VAPID公開鍵が設定されていません')
    }

    // Push購読を作成
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    // サーバーに購読情報を送信
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '購読登録に失敗しました')
    }

    return true
  }, [])

  // Push購読を解除
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // サーバーから購読を削除
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      // ブラウザの購読を解除
      await subscription.unsubscribe()
    }

    return true
  }, [])

  return { subscribe, unsubscribe }
}
