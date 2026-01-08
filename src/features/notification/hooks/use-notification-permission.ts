'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'

interface UseNotificationPermissionReturn {
  isSupported: boolean
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
}

// Notification APIのサポート検出（useSyncExternalStore用）
const emptySubscribe = () => () => {}
const getNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window
const getNotificationPermission = (): NotificationPermission =>
  typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'default'
const getServerSnapshot = () => false
const getServerPermission = (): NotificationPermission => 'default'

/**
 * ブラウザの通知サポート検出と権限管理を行うフック
 */
export function useNotificationPermission(): UseNotificationPermissionReturn {
  // ブラウザ通知サポート検出（SSR安全）
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    getNotificationSupported,
    getServerSnapshot
  )

  // 初期権限値（SSR安全）
  const initialPermission = useSyncExternalStore(
    emptySubscribe,
    getNotificationPermission,
    getServerPermission
  )

  // 権限リクエスト後の更新用state
  const [permission, setPermission] = useState<NotificationPermission>(initialPermission)

  // 通知権限をリクエスト
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied'
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [isSupported])

  return {
    isSupported,
    permission,
    requestPermission,
  }
}
