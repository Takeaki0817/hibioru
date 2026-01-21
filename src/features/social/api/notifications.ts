'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { createSafeError } from '@/lib/error-handler'
import type {
  SocialNotificationItem,
  SocialResult,
  SocialNotificationsResult,
  SocialNotificationType,
  AchievementType,
} from '../types'
import { SOCIAL_PAGINATION } from '../constants'

/**
 * ソーシャル通知を取得
 */
export async function getSocialNotifications(
  cursor?: string
): Promise<SocialResult<SocialNotificationsResult>> {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // 通知を取得
    let notificationsQuery = supabase
      .from('social_notifications')
      .select(`
        id,
        type,
        from_user_id,
        achievement_id,
        created_at,
        from_user:users!social_notifications_from_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        achievement:achievements!social_notifications_achievement_id_fkey(
          type,
          threshold
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE + 1)

    if (cursor) {
      notificationsQuery = notificationsQuery.lt('created_at', cursor)
    }

    const { data: notifications, error: notificationsError } = await notificationsQuery

    if (notificationsError) {
      return {
        ok: false,
        error: createSafeError('DB_ERROR', notificationsError),
      }
    }

    const hasMore = notifications.length > SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE
    const items = notifications.slice(0, SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE)

    const notificationItems: SocialNotificationItem[] = items.map((notification) => {
      const fromUser = notification.from_user as unknown as {
        id: string
        username: string
        display_name: string
        avatar_url: string | null
      }
      const achievement = notification.achievement as unknown as {
        type: string
        threshold: number
      } | null

      return {
        id: notification.id,
        type: notification.type as SocialNotificationType,
        fromUser: {
          id: fromUser.id,
          username: fromUser.username,
          displayName: fromUser.display_name,
          avatarUrl: fromUser.avatar_url,
        },
        achievement: achievement
          ? {
              type: achievement.type as AchievementType,
              threshold: achievement.threshold,
            }
          : undefined,
        createdAt: notification.created_at,
      }
    })

    return {
      ok: true,
      value: {
        items: notificationItems,
        nextCursor: hasMore ? items[items.length - 1].created_at : null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}
