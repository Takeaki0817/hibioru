'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
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
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
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
        is_read,
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
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE + 1)

    if (cursor) {
      notificationsQuery = notificationsQuery.lt('created_at', cursor)
    }

    const { data: notifications, error: notificationsError } = await notificationsQuery

    if (notificationsError) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: notificationsError.message },
      }
    }

    // 未読数を取得
    const { count: unreadCount, error: unreadError } = await supabase
      .from('social_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .eq('is_read', false)

    if (unreadError) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: unreadError.message },
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
        isRead: notification.is_read,
        createdAt: notification.created_at,
      }
    })

    return {
      ok: true,
      value: {
        items: notificationItems,
        nextCursor: hasMore ? items[items.length - 1].created_at : null,
        unreadCount: unreadCount ?? 0,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 未読数を取得
 */
export async function getUnreadCount(): Promise<SocialResult<number>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { count, error } = await supabase
      .from('social_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .eq('is_read', false)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: count ?? 0 }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 通知を既読にする
 */
export async function markAsRead(notificationIds: string[]): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { error } = await supabase
      .from('social_notifications')
      .update({ is_read: true })
      .in('id', notificationIds)
      .eq('user_id', userData.user.id)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 全ての通知を既読にする
 */
export async function markAllAsRead(): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { error } = await supabase
      .from('social_notifications')
      .update({ is_read: true })
      .eq('user_id', userData.user.id)
      .eq('is_read', false)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}
