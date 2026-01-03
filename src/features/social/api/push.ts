'use server'

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendToAllDevices } from '@/features/notification/api/sender'
import type { AchievementType } from '../types'
import { getAchievementMessage } from '../constants'

/**
 * お祝い通知のプッシュを送信
 */
export async function sendCelebrationPushNotification(
  toUserId: string,
  fromUserName: string,
  achievementType: AchievementType,
  threshold: number
): Promise<void> {
  try {
    // 通知設定確認
    const adminClient = createAdminClient()
    const { data: settings, error: settingsError } = await adminClient
      .from('notification_settings')
      .select('social_notifications_enabled')
      .eq('user_id', toUserId)
      .single()

    if (settingsError || !settings?.social_notifications_enabled) {
      // 通知が無効な場合はスキップ
      return
    }

    const achievementMessage = getAchievementMessage(achievementType, threshold)
    const payload = {
      title: 'ヒビオル',
      body: `${fromUserName}さんがあなたの「${achievementMessage}」をお祝いしました 🎉`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/mypage?tab=notifications',
        type: 'celebration' as const,
        notificationId: crypto.randomUUID(),
        timestamp: Date.now(),
      },
    }

    await sendToAllDevices(toUserId, payload)
  } catch (error) {
    console.error('お祝いプッシュ通知送信エラー:', error)
  }
}

/**
 * フォロー通知のプッシュを送信
 */
export async function sendFollowPushNotification(
  toUserId: string,
  fromUserName: string
): Promise<void> {
  try {
    // 通知設定確認
    const adminClient = createAdminClient()
    const { data: settings, error: settingsError } = await adminClient
      .from('notification_settings')
      .select('social_notifications_enabled')
      .eq('user_id', toUserId)
      .single()

    if (settingsError || !settings?.social_notifications_enabled) {
      // 通知が無効な場合はスキップ
      return
    }

    const payload = {
      title: 'ヒビオル',
      body: `${fromUserName}さんがあなたをフォローしました`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/mypage?tab=notifications',
        type: 'follow' as const,
        notificationId: crypto.randomUUID(),
        timestamp: Date.now(),
      },
    }

    await sendToAllDevices(toUserId, payload)
  } catch (error) {
    console.error('フォロープッシュ通知送信エラー:', error)
  }
}
