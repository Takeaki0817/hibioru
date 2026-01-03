'use client'

import { useState, useCallback, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
 * お祝い操作の楽観的更新を提供
 *
 * 責務:
 * - 楽観的更新によるUI即時反映
 * - API呼び出しとエラーハンドリング
 * - ロールバック処理
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
  const [isCelebrated, setIsCelebrated] = useState(initialIsCelebrated)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  // フィードキャッシュを更新
  const updateFeedCache = useCallback(
    (newIsCelebrated: boolean) => {
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
                    celebrationCount: item.celebrationCount + (newIsCelebrated ? 1 : -1),
                  }
                : item
            ),
          })),
        }
      })
    },
    [queryClient, achievementId]
  )

  const toggle = useCallback(() => {
    const previousState = isCelebrated
    const previousCount = count
    const newState = !isCelebrated
    const newCount = newState ? count + 1 : Math.max(0, count - 1)

    // 楽観的更新: ローカルstate
    setIsCelebrated(newState)
    setCount(newCount)

    // 楽観的更新: フィードキャッシュ
    updateFeedCache(newState)

    startTransition(async () => {
      try {
        const result = newState
          ? await celebrateAchievement(achievementId)
          : await uncelebrateAchievement(achievementId)

        if (!result.ok) {
          // ロールバック: ローカルstate
          setIsCelebrated(previousState)
          setCount(previousCount)

          // ロールバック: フィードキャッシュ
          updateFeedCache(previousState)

          onError?.(new Error(result.error.message))
          return
        }

        // 成功時: コールバック呼び出し（refetchQueriesは不要、既に楽観的更新済み）
        onSuccess?.(newState)
      } catch (error) {
        // 予期せぬエラー時のロールバック
        setIsCelebrated(previousState)
        setCount(previousCount)
        updateFeedCache(previousState)

        onError?.(error instanceof Error ? error : new Error('お祝いの処理に失敗しました'))
      }
    })
  }, [achievementId, isCelebrated, count, updateFeedCache, onSuccess, onError])

  return {
    isCelebrated,
    count,
    isPending,
    toggle,
  }
}
