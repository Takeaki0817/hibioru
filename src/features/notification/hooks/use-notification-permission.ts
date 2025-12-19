'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseNotificationPermissionReturn {
  isSupported: boolean
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
}

/**
 * ブラウザの通知サポート検出と権限管理を行うフック
 */
export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // ブラウザ通知サポート検出
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

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
