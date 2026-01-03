'use client'

import { useState } from 'react'
import type { NotificationSettings as NotificationSettingsType, Reminder } from '../types'
import { DEFAULT_REMINDERS } from '../types'
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
  const [reminders, setReminders] = useState<Reminder[]>(
    initialSettings.reminders?.length > 0 ? initialSettings.reminders : DEFAULT_REMINDERS
  )
  const [socialNotificationsEnabled, setSocialNotificationsEnabled] = useState(
    initialSettings.social_notifications_enabled ?? true
  )
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

  // リマインドのトグル変更
  const handleReminderToggle = async (index: number, newEnabled: boolean) => {
    const previousReminders = [...reminders]
    const updatedReminders = reminders.map((r, i) =>
      i === index ? { ...r, enabled: newEnabled } : r
    )
    setReminders(updatedReminders)

    try {
      await updateSettings({ reminders: updatedReminders })
    } catch {
      setReminders(previousReminders)
    }
  }

  // リマインド時刻の変更
  const handleReminderTimeChange = async (index: number, newTime: string) => {
    const previousReminders = [...reminders]
    const updatedReminders = reminders.map((r, i) =>
      i === index ? { ...r, time: newTime || null } : r
    )
    setReminders(updatedReminders)

    try {
      await updateSettings({ reminders: updatedReminders })
    } catch {
      setReminders(previousReminders)
    }
  }

  // ソーシャル通知のトグル変更
  const handleSocialNotificationsToggle = async (newEnabled: boolean) => {
    const previousEnabled = socialNotificationsEnabled
    setSocialNotificationsEnabled(newEnabled)

    try {
      await updateSettings({ social_notifications_enabled: newEnabled })
    } catch {
      setSocialNotificationsEnabled(previousEnabled)
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
              リマインドやソーシャルの通知を受け取ります
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

      {/* リマインド時刻設定（5つ） */}
      {enabled && (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>リマインド時刻</Label>
            <p className="text-sm text-muted-foreground">
              設定した時刻に記録のリマインドが届きます（最大5つ）
            </p>

            <div className="space-y-3">
              {reminders.map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                  <Input
                    id={`reminder-time-${index}`}
                    type="time"
                    value={reminder.time || ''}
                    disabled={isLoading || !reminder.enabled}
                    onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                    className="flex-1"
                    placeholder="--:--"
                  />
                  <Switch
                    id={`reminder-toggle-${index}`}
                    checked={reminder.enabled}
                    onCheckedChange={(checked) => handleReminderToggle(index, checked)}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ソーシャル通知設定 */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="social-notification-toggle">ソーシャル通知</Label>
                <p className="text-sm text-muted-foreground">
                  お祝いやフォローをブラウザ通知で受け取る
                </p>
              </div>
              <Switch
                id="social-notification-toggle"
                checked={socialNotificationsEnabled}
                onCheckedChange={handleSocialNotificationsToggle}
                disabled={isLoading}
              />
            </div>
          </div>

        </div>
      )}
    </FeatureCard>
  )
}
