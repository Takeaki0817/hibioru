'use client'

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { celebrateAchievement, uncelebrateAchievement } from '../api/achievements'
import { queryKeys } from '@/lib/constants/query-keys'
import type { SocialFeedResult } from '../types'

// InfiniteQueryのデータ型
interface FeedQueryData {
  pages: SocialFeedResult[]
  pageParams: (string | undefined)[]
}

export interface UseCelebrationOptions {
  achievementId: string
  initialIsCelebrated: boolean
  initialCount: number
  onSuccess?: (isCelebrated: boolean) => void
  onError?: (error: Error) => void
}

export interface UseCelebrationReturn {
  isCelebrated: boolean
  count: number
  isPending: boolean
  toggle: () => void
}

/**
 * お祝い操作の楽観的更新を提供（useMutationベース）
 *
 * 責務:
 * - useMutationによる楽観的更新とロールバック
 * - API呼び出しとエラーハンドリング
 * - フィードキャッシュの同期
 */
export function useCelebration({
  achievementId,
  initialIsCelebrated,
  initialCount,
  onSuccess,
  onError,
}: UseCelebrationOptions): UseCelebrationReturn {
  const queryClient = useQueryClient()

  // フィードキャッシュから現在のお祝い状態を取得
  const getCurrentState = useCallback((): { isCelebrated: boolean; count: number } => {
    const queryKey = queryKeys.social.feed()
    const data = queryClient.getQueryData<FeedQueryData>(queryKey)

    if (!data) {
      return { isCelebrated: initialIsCelebrated, count: initialCount }
    }

    for (const page of data.pages) {
      for (const item of page.items) {
        if (item.id === achievementId) {
          return { isCelebrated: item.isCelebrated, count: item.celebrationCount }
        }
      }
    }

    return { isCelebrated: initialIsCelebrated, count: initialCount }
  }, [queryClient, achievementId, initialIsCelebrated, initialCount])

  // フィードキャッシュを更新
  const updateFeedCache = useCallback(
    (newIsCelebrated: boolean, newCount: number) => {
      const queryKey = queryKeys.social.feed()
      queryClient.setQueryData<FeedQueryData>(queryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === achievementId
                ? {
                    ...item,
                    isCelebrated: newIsCelebrated,
                    celebrationCount: newCount,
                  }
                : item
            ),
          })),
        }
      })
    },
    [queryClient, achievementId]
  )

  const mutation = useMutation({
    mutationFn: async (newState: boolean) => {
      const result = newState
        ? await celebrateAchievement(achievementId)
        : await uncelebrateAchievement(achievementId)

      if (!result.ok) {
        throw new Error(result.error.message)
      }

      return newState
    },
    onMutate: async (newState: boolean) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.social.feed() })

      // 楽観的更新のための前の状態を保存
      const previousState = getCurrentState()

      // 楽観的更新
      const newCount = newState
        ? previousState.count + 1
        : Math.max(0, previousState.count - 1)
      updateFeedCache(newState, newCount)

      // ロールバック用のコンテキストを返す
      return { previousState }
    },
    onError: (error, _newState, context) => {
      // エラー時はロールバック
      if (context?.previousState) {
        updateFeedCache(context.previousState.isCelebrated, context.previousState.count)
      }
      onError?.(error instanceof Error ? error : new Error('お祝いの処理に失敗しました'))
    },
    onSuccess: (newState) => {
      onSuccess?.(newState)
    },
    // 再試行は行わない（楽観的更新が即座にロールバックされるため）
    retry: false,
  })

  const currentState = getCurrentState()

  const toggle = useCallback(() => {
    const newState = !currentState.isCelebrated
    mutation.mutate(newState)
  }, [mutation, currentState.isCelebrated])

  return {
    isCelebrated: currentState.isCelebrated,
    count: currentState.count,
    isPending: mutation.isPending,
    toggle,
  }
}
