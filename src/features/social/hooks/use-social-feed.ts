'use client'

import { useCallback, useMemo } from 'react'
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getSocialFeed } from '../api/timeline'
import type { SocialFeedItem, SocialFeedResult } from '../types'

// キャッシュ設定
const FEED_STALE_TIME = 5 * 60 * 1000 // 5分
const FEED_GC_TIME = 10 * 60 * 1000 // 10分

// InfiniteQueryのデータ型
interface FeedQueryData {
  pages: SocialFeedResult[]
  pageParams: (string | undefined)[]
}

/**
 * ソーシャルフィードのデータ取得とキャッシュ操作
 *
 * 責務:
 * - useInfiniteQueryによるフィード取得
 * - 楽観的更新のためのキャッシュ操作関数提供
 * - お祝い状態の更新
 */
export interface UseSocialFeedReturn {
  // データ取得
  feedItems: SocialFeedItem[]
  isLoading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  refetch: () => void
  // キャッシュ操作
  updateCelebration: (itemId: string, isCelebrated: boolean) => void
  removeFeedItem: (achievementId: string) => void
  invalidateFeed: () => void
}

export function useSocialFeed(): UseSocialFeedReturn {
  const queryClient = useQueryClient()
  const queryKey = [...queryKeys.social.all, 'feed']

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        const result = await getSocialFeed(pageParam)
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        return result.value
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      staleTime: FEED_STALE_TIME,
      gcTime: FEED_GC_TIME,
    })

  // ページをフラット化してフィードアイテムを取得
  const feedItems = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data?.pages])

  // 楽観的更新: お祝い状態を更新
  const updateCelebration = useCallback(
    (itemId: string, isCelebrated: boolean) => {
      queryClient.setQueryData<FeedQueryData>(queryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    isCelebrated,
                    celebrationCount: item.celebrationCount + (isCelebrated ? 1 : -1),
                  }
                : item
            ),
          })),
        }
      })
    },
    [queryClient, queryKey]
  )

  // 楽観的更新: フィードからアイテムを削除
  const removeFeedItem = useCallback(
    (achievementId: string) => {
      queryClient.setQueryData<FeedQueryData>(queryKey, (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== achievementId),
          })),
        }
      })
    },
    [queryClient, queryKey]
  )

  // キャッシュ無効化
  const invalidateFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    feedItems,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage: () => fetchNextPage(),
    isFetchingNextPage,
    refetch: () => refetch(),
    updateCelebration,
    removeFeedItem,
    invalidateFeed,
  }
}
