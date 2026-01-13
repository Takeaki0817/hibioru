'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNotificationPermission } from './use-notification-permission'
import { usePushSubscription } from './use-push-subscription'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { logger } from '@/lib/logger'

interface UseNotificationPromptReturn {
  /** プロンプトを表示すべきか */
  shouldShowPrompt: boolean
  /** 許可処理中 */
  isLoading: boolean
  /** 「許可する」を押した時 */
  handleAllow: () => Promise<void>
  /** 「後で」を押した時 */
  handleDismiss: () => Promise<void>
  /** エラーメッセージ */
  error: string | null
}

/**
 * 初回通知許可プロンプト管理フック
 */
export function useNotificationPrompt(): UseNotificationPromptReturn {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  const { isSupported, permission, requestPermission } = useNotificationPermission()
  const { subscribe } = usePushSubscription()

  const [promptShown, setPromptShown] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 通知設定を取得
  useEffect(() => {
    if (!user || !isInitialized) return

    let isMounted = true

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/notification/settings')
        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          setPromptShown(data.notification_prompt_shown ?? false)
        } else {
          // 設定が存在しない場合は未表示として扱う
          setPromptShown(false)
        }
      } catch {
        if (isMounted) {
          setPromptShown(false)
        }
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, [user, isInitialized])

  // 通知設定を更新
  const updateSettings = async (updates: Record<string, unknown>) => {
    const response = await fetch('/api/notification/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('設定の更新に失敗しました')
    }

    return response.json()
  }

  // プロンプト表示条件
  const shouldShowPrompt =
    isInitialized &&
    user !== null &&
    promptShown === false &&
    isSupported &&
    permission === 'default' // まだ許可/拒否していない

  // 「許可する」ハンドラ
  const handleAllow = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // 通知許可をリクエスト
      const result = await requestPermission()

      if (result === 'granted') {
        // Push購読を登録
        await subscribe()

        // 通知設定を有効化 & プロンプト表示済みに
        await updateSettings({
          enabled: true,
          notification_prompt_shown: true,
        })

        setPromptShown(true)
      } else if (result === 'denied') {
        setError('通知が拒否されました。ブラウザの設定から変更できます。')
        // プロンプト表示済みに（再表示しない）
        await updateSettings({
          notification_prompt_shown: true,
        })
        setPromptShown(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知設定に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [user, requestPermission, subscribe])

  // 「後で」ハンドラ
  const handleDismiss = useCallback(async () => {
    if (!user) return

    try {
      // プロンプト表示済みに（再表示しない）
      await updateSettings({
        notification_prompt_shown: true,
      })

      setPromptShown(true)
    } catch (err) {
      logger.error('通知設定の更新に失敗', err)
    }
  }, [user])

  return {
    shouldShowPrompt,
    isLoading,
    handleAllow,
    handleDismiss,
    error,
  }
}
