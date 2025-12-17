'use client'

import { useState, useEffect } from 'react'
import type { NotificationSettings as NotificationSettingsType } from '@/lib/notification/types'

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

  // 通知のオン/オフ切り替え
  const handleToggleNotification = async () => {
    if (!isSupported) {
      setError('このブラウザは通知をサポートしていません')
      return
    }

    if (!enabled && permission !== 'granted') {
      // 通知を有効化する場合は権限をリクエスト
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('通知が拒否されました。ブラウザの設定から許可してください。')
        return
      }
    }

    // 楽観的更新
    const newEnabled = !enabled
    setEnabled(newEnabled)

    try {
      await updateSettings({ enabled: newEnabled })
    } catch {
      // 失敗時はロールバック
      setEnabled(!newEnabled)
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">通知設定</h2>
        <p className="text-gray-600">
          このブラウザは通知機能をサポートしていません。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">通知設定</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 通知許可状態 */}
      {permission === 'denied' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
          通知が拒否されています。ブラウザの設定から通知を許可してください。
        </div>
      )}

      {/* 通知のオン/オフ */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="notification-toggle" className="font-medium">
              通知を受け取る
            </label>
            <p className="text-sm text-gray-500 mt-1">
              毎日決まった時刻にリマインド通知を送ります
            </p>
          </div>
          <button
            id="notification-toggle"
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isLoading || permission === 'denied'}
            onClick={handleToggleNotification}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
              ${enabled ? 'bg-orange-500' : 'bg-gray-200'}
              ${isLoading || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* リマインド時刻設定 */}
      {enabled && (
        <div>
          <label htmlFor="reminder-time" className="block font-medium mb-2">
            リマインド時刻
          </label>
          <input
            id="reminder-time"
            type="time"
            value={reminderTime}
            disabled={isLoading}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="
              block w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          <p className="text-sm text-gray-500 mt-2">
            毎日この時刻に記録のリマインドが届きます
          </p>
        </div>
      )}
    </div>
  )
}
