'use server'

import 'server-only'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { authActionClient } from '@/lib/safe-action'
import { logger } from '@/lib/logger'
import { createSafeError } from '@/lib/error-handler'
import { rateLimits, checkRateLimit, getRateLimitErrorMessage } from '@/lib/rate-limit'
import type { FollowCounts, PublicUserInfo, SocialResult, PaginatedResult } from '../types'
import { SOCIAL_PAGINATION } from '../constants'
import { sendFollowPushNotification } from './push'

// 入力スキーマ
const followSchema = z.object({
  targetUserId: z.string().uuid(),
})

/**
 * フォロー中のユーザーIDリストを取得
 * E2Eテストモードでは authActionClient 経由で RLS をバイパス
 */
export const getFollowingIdsAction = authActionClient.action(
  async ({ ctx: { user, supabase } }) => {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (error) {
      logger.error('フォロー中ユーザーIDの取得に失敗', error.message)
      throw new Error(`フォロー情報の取得に失敗しました: ${error.message}`)
    }

    return data?.map((f) => f.following_id) || []
  }
)

/**
 * ユーザーをフォロー
 */
export const followUser = authActionClient
  .inputSchema(followSchema)
  .action(async ({ parsedInput: { targetUserId }, ctx: { user, supabase } }) => {
    // レート制限チェック
    const rateCheck = await checkRateLimit(rateLimits.follow, user.id)
    if (!rateCheck.success) {
      throw new Error(getRateLimitErrorMessage(rateCheck.resetAt))
    }

    // 自分自身をフォローしようとした場合
    if (user.id === targetUserId) {
      throw new Error('自分自身をフォローすることはできません')
    }

    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    })

    if (error) {
      // ユニーク制約違反（既にフォロー済み）
      if (error.code === '23505') {
        throw new Error('既にフォローしています')
      }
      logger.error('フォロー処理失敗', error)
      throw new Error('フォロー処理に失敗しました')
    }

    // フォロー通知を作成（admin clientでRLSをバイパス）
    const adminClient = createAdminClient()
    await adminClient.from('social_notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      from_user_id: user.id,
    })

    // プッシュ通知を送信（非同期、エラーは無視）
    const { data: fromUser } = await supabase
      .from('users')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    if (fromUser) {
      sendFollowPushNotification(
        targetUserId,
        fromUser.display_name || fromUser.username
      ).catch((err) => {
        logger.error('フォロープッシュ通知エラー', err)
      })
    }

    // ソーシャルページのSSRキャッシュを無効化
    revalidatePath('/social')

    return { success: true }
  })

/**
 * フォロー解除
 */
export const unfollowUser = authActionClient
  .inputSchema(followSchema)
  .action(async ({ parsedInput: { targetUserId }, ctx: { user, supabase } }) => {
    // レート制限チェック
    const rateCheck = await checkRateLimit(rateLimits.follow, user.id)
    if (!rateCheck.success) {
      throw new Error(getRateLimitErrorMessage(rateCheck.resetAt))
    }

    const { error, count } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (error) {
      logger.error('フォロー解除失敗', error)
      throw new Error('フォロー解除に失敗しました')
    }

    // 削除された行がない場合（フォローしていなかった）
    if (count === 0) {
      throw new Error('フォローしていません')
    }

    // ソーシャルページのSSRキャッシュを無効化
    revalidatePath('/social')

    return { success: true }
  })

/**
 * フォロー状態を確認
 */
export async function isFollowing(targetUserId: string): Promise<SocialResult<boolean>> {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()

    if (error) {
      logger.error('フォロー状態確認失敗', error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', error),
      }
    }

    return { ok: true, value: data !== null }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}

/**
 * フォロー数を取得（自分のみ）
 */
export async function getFollowCounts(): Promise<SocialResult<FollowCounts>> {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
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
        .eq('follower_id', user.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id),
    ])

    if (followingResult.error) {
      logger.error('フォロー数取得失敗', followingResult.error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', followingResult.error),
      }
    }

    if (followerResult.error) {
      logger.error('フォロワー数取得失敗', followerResult.error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', followerResult.error),
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
      error: createSafeError('DB_ERROR', error),
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
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
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
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      logger.error('フォロー中一覧取得失敗', error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', error),
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
      error: createSafeError('DB_ERROR', error),
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
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
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
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      logger.error('フォロワー一覧取得失敗', error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', error),
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
      error: createSafeError('DB_ERROR', error),
    }
  }
}
