'use client'

import { useState, useEffect } from 'react'
import type { NotificationSettings as NotificationSettingsType } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface NotificationSettingsProps {
  initialSettings: NotificationSettingsType
}

export function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [reminderTime, setReminderTime] = useState(initialSettings.main_reminder_time)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ブラウザ通知サポート検出
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  // 通知設定を更新
  const updateSettings = async (updates: Partial<NotificationSettingsType>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notification/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Push購読を登録
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      // VAPID公開鍵を取得
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID公開鍵が設定されていません')
      }

      // Base64をUint8Arrayに変換
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
      }

      // Push購読を作成
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // サーバーに購読情報を送信
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '購読登録に失敗しました')
      }

      return true
    } catch (err) {
      throw err
    }
  }

  // Push購読を解除
  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // サーバーから購読を削除
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        // ブラウザの購読を解除
        await subscription.unsubscribe()
      }

      return true
    } catch (err) {
      throw err
    }
  }

  // 通知のオン/オフ切り替え
  const handleToggleNotification = async () => {
    if (!isSupported) {
      setError('このブラウザは通知をサポートしていません')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!enabled) {
        // 通知を有効化
        if (permission !== 'granted') {
          const result = await Notification.requestPermission()
          setPermission(result)

          if (result !== 'granted') {
            setError('通知が拒否されました。ブラウザの設定から許可してください。')
            return
          }
        }

        // Push購読を登録
        await subscribeToPush()

        // 設定を更新
        await updateSettings({ enabled: true })
        setEnabled(true)
      } else {
        // 通知を無効化
        await unsubscribeFromPush()
        await updateSettings({ enabled: false })
        setEnabled(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知設定の更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // リマインド時刻の変更
  const handleTimeChange = async (newTime: string) => {
    setReminderTime(newTime)

    try {
      await updateSettings({ main_reminder_time: newTime })
    } catch {
      // 失敗時はロールバック
      setReminderTime(reminderTime)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">通知設定</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            このブラウザは通知機能をサポートしていません。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">通知設定</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 通知許可状態 */}
        {permission === 'denied' && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              通知が拒否されています。ブラウザの設定から通知を許可してください。
            </AlertDescription>
          </Alert>
        )}

        {/* 通知のオン/オフ */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notification-toggle">通知を受け取る</Label>
              <p className="text-sm text-muted-foreground">
                毎日決まった時刻にリマインド通知を送ります
              </p>
            </div>
            <Switch
              id="notification-toggle"
              checked={enabled}
              onCheckedChange={handleToggleNotification}
              disabled={isLoading || permission === 'denied'}
            />
          </div>
        </div>

        {/* リマインド時刻設定 */}
        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time">リマインド時刻</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              disabled={isLoading}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              毎日この時刻に記録のリマインドが届きます
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
