'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FollowCounts, PublicUserInfo, SocialResult, PaginatedResult } from '../types'
import { SOCIAL_PAGINATION } from '../constants'
import { sendFollowPushNotification } from './push'

/**
 * ユーザーをフォロー
 */
export async function followUser(targetUserId: string): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // 自分自身をフォローしようとした場合
    if (userData.user.id === targetUserId) {
      return {
        ok: false,
        error: { code: 'SELF_FOLLOW', message: '自分自身をフォローすることはできません' },
      }
    }

    const { error } = await supabase.from('follows').insert({
      follower_id: userData.user.id,
      following_id: targetUserId,
    })

    if (error) {
      // ユニーク制約違反（既にフォロー済み）
      if (error.code === '23505') {
        return {
          ok: false,
          error: { code: 'ALREADY_FOLLOWING', message: '既にフォローしています' },
        }
      }
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    // フォロー通知を作成（admin clientでRLSをバイパス）
    const adminClient = createAdminClient()
    await adminClient.from('social_notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      from_user_id: userData.user.id,
    })

    // プッシュ通知を送信（非同期、エラーは無視）
    const { data: fromUser } = await supabase
      .from('users')
      .select('display_name, username')
      .eq('id', userData.user.id)
      .single()

    if (fromUser) {
      sendFollowPushNotification(
        targetUserId,
        fromUser.display_name || fromUser.username
      ).catch((error) => {
        console.error('フォロープッシュ通知エラー:', error)
      })
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
 * フォロー解除
 */
export async function unfollowUser(targetUserId: string): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { error, count } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userData.user.id)
      .eq('following_id', targetUserId)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    // 削除された行がない場合（フォローしていなかった）
    if (count === 0) {
      return {
        ok: false,
        error: { code: 'NOT_FOLLOWING', message: 'フォローしていません' },
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
 * フォロー状態を確認
 */
export async function isFollowing(targetUserId: string): Promise<SocialResult<boolean>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userData.user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: data !== null }
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
 * フォロー数を取得（自分のみ）
 */
export async function getFollowCounts(): Promise<SocialResult<FollowCounts>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // フォロー中・フォロワー数を並列取得
    const [followingResult, followerResult] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userData.user.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userData.user.id),
    ])

    if (followingResult.error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: followingResult.error.message },
      }
    }

    if (followerResult.error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: followerResult.error.message },
      }
    }

    return {
      ok: true,
      value: {
        followingCount: followingResult.count ?? 0,
        followerCount: followerResult.count ?? 0,
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
 * フォロー中のユーザー一覧を取得
 */
export async function getFollowingList(
  cursor?: string
): Promise<SocialResult<PaginatedResult<PublicUserInfo>>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    let query = supabase
      .from('follows')
      .select(`
        id,
        created_at,
        following:users!follows_following_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('follower_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    const hasMore = data.length > SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE
    const items = data.slice(0, SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE)

    return {
      ok: true,
      value: {
        items: items.map((item) => {
          const user = item.following as unknown as {
            id: string
            username: string
            display_name: string
            avatar_url: string | null
          }
          return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
          }
        }),
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

/**
 * フォロワー一覧を取得
 */
export async function getFollowerList(
  cursor?: string
): Promise<SocialResult<PaginatedResult<PublicUserInfo>>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    let query = supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower:users!follows_follower_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('following_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    const hasMore = data.length > SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE
    const items = data.slice(0, SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE)

    return {
      ok: true,
      value: {
        items: items.map((item) => {
          const user = item.follower as unknown as {
            id: string
            username: string
            display_name: string
            avatar_url: string | null
          }
          return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
          }
        }),
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

