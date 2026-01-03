'use client'

import { useCallback, useMemo } from 'react'
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getSocialNotifications } from '../api/notifications'
import type { SocialNotificationItem, SocialNotificationsResult } from '../types'

// キャッシュ設定
const NOTIFICATIONS_STALE_TIME = 5 * 60 * 1000 // 5分
const NOTIFICATIONS_GC_TIME = 10 * 60 * 1000 // 10分

/**
 * ソーシャル通知のデータ取得とキャッシュ操作
 *
 * 責務:
 * - useInfiniteQueryによる通知取得
 * - キャッシュ管理
 */
export interface UseSocialNotificationsReturn {
  // データ取得
  notifications: SocialNotificationItem[]
  isLoading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  refetch: () => void
  // キャッシュ操作
  invalidateNotifications: () => void
}

export function useSocialNotifications(): UseSocialNotificationsReturn {
  const queryClient = useQueryClient()
  const queryKey = [...queryKeys.social.all, 'notifications']

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        const result = await getSocialNotifications(pageParam)
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        return result.value
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      staleTime: NOTIFICATIONS_STALE_TIME,
      gcTime: NOTIFICATIONS_GC_TIME,
    })

  // ページをフラット化して通知リストを取得
  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages]
  )

  // キャッシュ無効化
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    notifications,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage: () => fetchNextPage(),
    isFetchingNextPage,
    refetch: () => refetch(),
    invalidateNotifications,
  }
}
