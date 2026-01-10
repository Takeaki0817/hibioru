'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
 * フォロー操作の楽観的更新を提供（useQuery + useMutationベース）
 *
 * 責務:
 * - useQueryによるフォロー状態の取得
 * - useMutationによる楽観的更新とロールバック
 * - API呼び出しとエラーハンドリング
 * - 関連クエリの無効化
 */
export function useFollow({
  userId,
  initialIsFollowing,
  onSuccess,
  onError,
}: UseFollowOptions): UseFollowReturn {
  const queryClient = useQueryClient()

  // フォロー状態を取得（useQuery）
  const { data: isFollowing, isLoading } = useQuery({
    queryKey: queryKeys.social.followStatus(userId),
    queryFn: async () => {
      const result = await checkIsFollowing(userId)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.value
    },
    initialData: initialIsFollowing,
    staleTime: 5 * 60 * 1000, // 5分
    enabled: initialIsFollowing === undefined, // initialDataがある場合はフェッチしない
  })

  // フォロー/アンフォロー mutation
  const mutation = useMutation({
    mutationFn: async (newState: boolean) => {
      const result = newState
        ? await followUser({ targetUserId: userId })
        : await unfollowUser({ targetUserId: userId })
      if (result.serverError) {
        throw new Error(result.serverError)
      }
      return newState
    },
    onMutate: async (newState: boolean) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.social.followStatus(userId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.social.myFollowCounts() })

      // 楽観的更新のための前の状態を保存
      const previousIsFollowing = queryClient.getQueryData<boolean>(
        queryKeys.social.followStatus(userId)
      )
      const previousCounts = queryClient.getQueryData<FollowCounts>(
        queryKeys.social.myFollowCounts()
      )

      // 楽観的更新: フォロー状態
      queryClient.setQueryData(queryKeys.social.followStatus(userId), newState)

      // 楽観的更新: 自分のフォローカウント
      if (previousCounts) {
        queryClient.setQueryData<FollowCounts>(queryKeys.social.myFollowCounts(), {
          ...previousCounts,
          followingCount: previousCounts.followingCount + (newState ? 1 : -1),
        })
      }

      // ロールバック用のコンテキストを返す
      return { previousIsFollowing, previousCounts }
    },
    onError: (error, _newState, context) => {
      // エラー時はロールバック
      if (context?.previousIsFollowing !== undefined) {
        queryClient.setQueryData(queryKeys.social.followStatus(userId), context.previousIsFollowing)
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(queryKeys.social.myFollowCounts(), context.previousCounts)
      }
      onError?.(error instanceof Error ? error : new Error('フォロー処理に失敗しました'))
    },
    onSuccess: async (newState) => {
      // 成功時: 関連クエリを無効化
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.social.notifications() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.social.followCounts(userId) }),
      ])
      onSuccess?.(newState)
    },
    // 再試行は行わない（楽観的更新が即座にロールバックされるため）
    retry: false,
  })

  const toggle = useCallback(() => {
    if (isFollowing === undefined) return
    mutation.mutate(!isFollowing)
  }, [mutation, isFollowing])

  return {
    isFollowing: isFollowing ?? null,
    isPending: mutation.isPending,
    isLoading,
    toggle,
  }
}
