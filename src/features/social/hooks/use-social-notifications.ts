'use client'

import { useCallback, useMemo } from 'react'
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getSocialNotifications } from '../api/notifications'
import type { SocialNotificationItem } from '../types'
import { SOCIAL_QUERY_CONFIG } from '../constants'

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
  const queryKey = queryKeys.social.notifications()

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
      staleTime: SOCIAL_QUERY_CONFIG.notifications.staleTime,
      gcTime: SOCIAL_QUERY_CONFIG.notifications.gcTime,
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
