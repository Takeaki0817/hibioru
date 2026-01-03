'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { SocialFeedItem, SocialResult, SocialFeedResult, AchievementType } from '../types'
import { SOCIAL_PAGINATION } from '../constants'

/**
 * ソーシャルフィードを取得
 * フォロー中のユーザーの達成と共有投稿を表示
 */
export async function getSocialFeed(cursor?: string): Promise<SocialResult<SocialFeedResult>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // フォロー中のユーザーIDとフォロー開始時刻を取得
    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', userData.user.id)

    if (followingError) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: followingError.message },
      }
    }

    if (followingData.length === 0) {
      return {
        ok: true,
        value: { items: [], nextCursor: null },
      }
    }

    // フォロー情報をMapに変換（user_id -> followed_at）
    const followedAtMap = new Map<string, Date>(
      followingData.map((f) => [f.following_id, new Date(f.created_at)])
    )
    const followingIds = followingData.map((f) => f.following_id)

    // 達成を取得
    let achievementsQuery = supabase
      .from('achievements')
      .select(`
        id,
        user_id,
        type,
        threshold,
        value,
        entry_id,
        is_shared,
        created_at,
        user:users!achievements_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        entry:entries!achievements_entry_id_fkey(
          id,
          content,
          image_urls
        ),
        celebrations(
          id,
          from_user_id
        )
      `)
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.FEED_PAGE_SIZE + 1)

    if (cursor) {
      achievementsQuery = achievementsQuery.lt('created_at', cursor)
    }

    const { data: achievements, error: achievementsError } = await achievementsQuery

    if (achievementsError) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: achievementsError.message },
      }
    }

    // フォロー前の達成は各ユーザーにつき最新1件のみ表示
    const preFollowShownUsers = new Set<string>()
    const filteredAchievements = achievements.filter((achievement) => {
      const followedAt = followedAtMap.get(achievement.user_id)
      if (!followedAt) return false

      const achievedAt = new Date(achievement.created_at)

      // フォロー後の達成は全て表示
      if (achievedAt >= followedAt) {
        return true
      }

      // フォロー前の達成は各ユーザーにつき最新1件のみ
      if (!preFollowShownUsers.has(achievement.user_id)) {
        preFollowShownUsers.add(achievement.user_id)
        return true
      }

      return false
    })

    const hasMore = filteredAchievements.length > SOCIAL_PAGINATION.FEED_PAGE_SIZE
    const items = filteredAchievements.slice(0, SOCIAL_PAGINATION.FEED_PAGE_SIZE)

    const feedItems: SocialFeedItem[] = items.map((achievement) => {
      const user = achievement.user as unknown as {
        id: string
        username: string
        display_name: string
        avatar_url: string | null
      }
      const entry = achievement.entry as unknown as {
        id: string
        content: string
        image_urls: string[] | null
      } | null
      const celebrations = achievement.celebrations as unknown as {
        id: string
        from_user_id: string
      }[]

      const isCelebrated = celebrations.some((c) => c.from_user_id === userData.user!.id)

      return {
        id: achievement.id,
        type: achievement.is_shared ? 'shared_entry' : 'achievement',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        },
        achievement: {
          type: achievement.type as AchievementType,
          threshold: achievement.threshold,
          value: achievement.value,
        },
        entry: entry
          ? {
              id: entry.id,
              content: entry.content,
              imageUrls: entry.image_urls,
            }
          : undefined,
        celebrationCount: celebrations.length,
        isCelebrated,
        createdAt: achievement.created_at,
      }
    })

    return {
      ok: true,
      value: {
        items: feedItems,
        nextCursor: hasMore ? items[items.length - 1].created_at : null,
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
