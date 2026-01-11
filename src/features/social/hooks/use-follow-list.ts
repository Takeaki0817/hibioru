'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SocialResult, PublicUserInfo, PaginatedResult } from '../types'
import { ERROR_MESSAGES } from '../constants'

type FetchFunction = (cursor?: string) => Promise<SocialResult<PaginatedResult<PublicUserInfo>>>

interface UseFollowListOptions {
  /** データ取得関数 */
  fetchFn: FetchFunction
}

interface UseFollowListReturn {
  /** ユーザーリスト */
  users: PublicUserInfo[]
  /** 読み込み中フラグ */
  isLoading: boolean
  /** 次ページの有無 */
  hasMore: boolean
  /** 次ページカーソル */
  nextCursor: string | null
  /** エラーメッセージ */
  error: string | null
  /** 次ページを読み込む */
  loadMore: (cursor: string) => Promise<void>
  /** リトライ */
  retryFetch: () => void
}

/**
 * フォローリスト取得の共通ロジック
 *
 * FollowingList と FollowerList で共有される:
 * - 状態管理（users, isLoading, hasMore, nextCursor, error）
 * - 初回データ取得（isMountedパターン適用）
 * - ページネーション
 * - リトライ処理
 */
export function useFollowList({ fetchFn }: UseFollowListOptions): UseFollowListReturn {
  const [users, setUsers] = useState<PublicUserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ページネーション: 次ページを読み込み
  const loadMore = useCallback(
    async (cursor: string) => {
      setIsLoading(true)
      const result = await fetchFn(cursor)
      setIsLoading(false)

      if (result.ok) {
        setUsers((prev) => [...prev, ...result.value.items])
        setNextCursor(result.value.nextCursor)
        setHasMore(!!result.value.nextCursor)
      } else {
        setError(result.error?.message ?? ERROR_MESSAGES.FOLLOW_LIST_LOAD_FAILED)
      }
    },
    [fetchFn]
  )

  // マウント時に初回データを取得
  useEffect(() => {
    let isMounted = true

    const fetchInitial = async () => {
      const result = await fetchFn()
      if (!isMounted) return

      setIsLoading(false)
      if (result.ok) {
        setUsers(result.value.items)
        setNextCursor(result.value.nextCursor)
        setHasMore(!!result.value.nextCursor)
      } else {
        setError(result.error?.message ?? ERROR_MESSAGES.FOLLOW_LIST_LOAD_FAILED)
      }
    }

    fetchInitial()

    return () => {
      isMounted = false
    }
  }, [fetchFn])

  // リトライ: エラー時に再取得
  const retryFetch = useCallback(() => {
    setError(null)
    setIsLoading(true)

    fetchFn().then((result) => {
      setIsLoading(false)
      if (result.ok) {
        setUsers(result.value.items)
        setNextCursor(result.value.nextCursor)
        setHasMore(!!result.value.nextCursor)
      } else {
        setError(result.error?.message ?? ERROR_MESSAGES.FOLLOW_LIST_LOAD_FAILED)
      }
    })
  }, [fetchFn])

  return {
    users,
    isLoading,
    hasMore,
    nextCursor,
    error,
    loadMore,
    retryFetch,
  }
}
