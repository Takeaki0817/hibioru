'use client'

import { useState } from 'react'
import type { NotificationSettings as NotificationSettingsType } from '../types'
import { FeatureCard } from '@/components/ui/feature-card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNotificationPermission } from '../hooks/use-notification-permission'
import { usePushSubscription } from '../hooks/use-push-subscription'

interface NotificationSettingsProps {
  initialSettings: NotificationSettingsType
}

export function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const { isSupported, permission, requestPermission } = useNotificationPermission()
  const { subscribe, unsubscribe } = usePushSubscription()

  const [enabled, setEnabled] = useState(initialSettings.enabled)
  const [reminderTime, setReminderTime] = useState(initialSettings.main_reminder_time)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          const result = await requestPermission()

          if (result !== 'granted') {
            setError('通知が拒否されました。ブラウザの設定から許可してください。')
            return
          }
        }

        // Push購読を登録
        await subscribe()

        // 設定を更新
        await updateSettings({ enabled: true })
        setEnabled(true)
      } else {
        // 通知を無効化
        await unsubscribe()
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
      <FeatureCard title="通知設定" titleSize="xl">
        <p className="text-muted-foreground">
          このブラウザは通知機能をサポートしていません。
        </p>
      </FeatureCard>
    )
  }

  return (
    <FeatureCard title="通知設定" titleSize="xl">
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
    </FeatureCard>
  )
}
