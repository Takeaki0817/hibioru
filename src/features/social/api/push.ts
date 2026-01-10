'use server'

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendToAllDevices } from '@/lib/push/sender'
import { logger } from '@/lib/logger'
import type { AchievementType } from '../types'
import { getAchievementMessage } from '../constants'

/**
 * ソーシャル通知が有効かチェック
 * @returns 有効な場合true、無効またはエラー時はfalse
 */
async function isSocialNotificationEnabled(userId: string): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data: settings, error: settingsError } = await adminClient
    .from('notification_settings')
    .select('social_notifications_enabled')
    .eq('user_id', userId)
    .single()

  return !settingsError && settings?.social_notifications_enabled === true
}

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
    if (!(await isSocialNotificationEnabled(toUserId))) {
      return
    }

    const achievementMessage = getAchievementMessage(achievementType, threshold)
    const payload = {
      title: 'ヒビオル',
      body: `${fromUserName}さんがあなたの「${achievementMessage}」をお祝いしました 🎉`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/social?tab=notifications',
        type: 'celebration' as const,
        notificationId: crypto.randomUUID(),
        timestamp: Date.now(),
      },
    }

    await sendToAllDevices(toUserId, payload)
  } catch (error) {
    logger.error('お祝いプッシュ通知送信エラー', error)
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
    if (!(await isSocialNotificationEnabled(toUserId))) {
      return
    }

    const payload = {
      title: 'ヒビオル',
      body: `${fromUserName}さんがあなたをフォローしました`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/social?tab=notifications',
        type: 'follow' as const,
        notificationId: crypto.randomUUID(),
        timestamp: Date.now(),
      },
    }

    await sendToAllDevices(toUserId, payload)
  } catch (error) {
    logger.error('フォロープッシュ通知送信エラー', error)
  }
}
