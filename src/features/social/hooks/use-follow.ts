'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '../api/follows'
import { queryKeys } from '@/lib/constants/query-keys'
import type { FollowCounts } from '../types'

export interface UseFollowOptions {
  userId: string
  initialIsFollowing?: boolean
  onSuccess?: (isFollowing: boolean) => void
  onError?: (error: Error) => void
}

export interface UseFollowReturn {
  isFollowing: boolean | null
  isPending: boolean
  isLoading: boolean
  toggle: () => void
}

/**
 * フォロー操作の楽観的更新を提供
 *
 * 責務:
 * - フォロー状態の取得と楽観的更新
 * - API呼び出しとエラーハンドリング
 * - ロールバック処理
 * - 関連クエリの無効化
 */
export function useFollow({
  userId,
  initialIsFollowing,
  onSuccess,
  onError,
}: UseFollowOptions): UseFollowReturn {
  const queryClient = useQueryClient()
  const [isFollowing, setIsFollowing] = useState<boolean | null>(initialIsFollowing ?? null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(initialIsFollowing === undefined)

  // 初期フォロー状態を取得
  useEffect(() => {
    if (isFollowing === null) {
      setIsLoading(true)
      checkIsFollowing(userId)
        .then((result) => {
          if (result.ok) {
            setIsFollowing(result.value)
          }
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [userId, isFollowing])

  // フィードキャッシュを無効化
  const invalidateRelatedQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.social.followCounts(userId) }),
    ])
  }, [queryClient, userId])

  const toggle = useCallback(() => {
    if (isFollowing === null) return

    const previousState = isFollowing
    const newState = !isFollowing

    // 楽観的更新: ローカルstate
    setIsFollowing(newState)

    // 楽観的更新: 自分のフォローカウント
    const previousCounts = queryClient.getQueryData<FollowCounts>(
      queryKeys.social.myFollowCounts()
    )
    if (previousCounts) {
      queryClient.setQueryData<FollowCounts>(queryKeys.social.myFollowCounts(), {
        ...previousCounts,
        followingCount: previousCounts.followingCount + (newState ? 1 : -1),
      })
    }

    startTransition(async () => {
      try {
        const result = newState ? await followUser(userId) : await unfollowUser(userId)

        if (!result.ok) {
          // ロールバック: ローカルstate
          setIsFollowing(previousState)
          // ロールバック: フォローカウント
          if (previousCounts) {
            queryClient.setQueryData(queryKeys.social.myFollowCounts(), previousCounts)
          }
          onError?.(new Error(result.error.message))
          return
        }

        // 成功時: 関連クエリを無効化
        await invalidateRelatedQueries()
        onSuccess?.(newState)
      } catch (error) {
        // 予期せぬエラー時のロールバック
        setIsFollowing(previousState)
        if (previousCounts) {
          queryClient.setQueryData(queryKeys.social.myFollowCounts(), previousCounts)
        }
        onError?.(error instanceof Error ? error : new Error('フォロー処理に失敗しました'))
      }
    })
  }, [userId, isFollowing, queryClient, invalidateRelatedQueries, onSuccess, onError])

  return {
    isFollowing,
    isPending,
    isLoading,
    toggle,
  }
}
