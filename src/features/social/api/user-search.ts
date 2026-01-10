'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createSafeError } from '@/lib/error-handler'
import { rateLimits, checkRateLimit, getRateLimitErrorMessage } from '@/lib/rate-limit'
import type { PublicUserInfo, SocialResult, UserSearchResult } from '../types'
import { SOCIAL_PAGINATION, escapeIlikeWildcards } from '../constants'

/**
 * ユーザーを検索（username または display_name で部分一致）
 */
export async function searchUsers(
  query: string,
  cursor?: string
): Promise<SocialResult<UserSearchResult>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // レート制限チェック
    const rateCheck = await checkRateLimit(rateLimits.search, userData.user.id)
    if (!rateCheck.success) {
      return {
        ok: false,
        error: { code: 'RATE_LIMITED', message: getRateLimitErrorMessage(rateCheck.resetAt) },
      }
    }

    // 検索クエリを正規化
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.length === 0) {
      return {
        ok: true,
        value: { items: [], nextCursor: null },
      }
    }

    // @付きの場合は除去
    const searchTerm = normalizedQuery.startsWith('@')
      ? normalizedQuery.slice(1)
      : normalizedQuery

    // ワイルドカード文字をエスケープ（%と_が検索文字として使える）
    const escapedTerm = escapeIlikeWildcards(searchTerm)

    // ILIKE検索（大文字小文字を区別しない部分一致）
    let searchQuery = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, created_at')
      .neq('id', userData.user.id) // 自分を除外
      .or(`username.ilike.%${escapedTerm}%,display_name.ilike.%${escapedTerm}%`)
      .order('created_at', { ascending: false })
      .limit(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE + 1)

    if (cursor) {
      searchQuery = searchQuery.lt('created_at', cursor)
    }

    const { data, error } = await searchQuery

    if (error) {
      logger.error('ユーザー検索失敗', error)
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
        items: items.map((user): PublicUserInfo => ({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        })),
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
