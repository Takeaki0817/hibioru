'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getSocialNotifications, markAllAsRead } from '../api/notifications'
import type { SocialNotificationItem, SocialNotificationsResult } from '../types'

// キャッシュ設定
const NOTIFICATIONS_STALE_TIME = 5 * 60 * 1000 // 5分
const NOTIFICATIONS_GC_TIME = 10 * 60 * 1000 // 10分

// InfiniteQueryのデータ型
interface NotificationsQueryData {
  pages: SocialNotificationsResult[]
  pageParams: (string | undefined)[]
}

/**
 * ソーシャル通知のデータ取得とキャッシュ操作
 *
 * 責務:
 * - useInfiniteQueryによる通知取得
 * - 未読数の管理
 * - 既読処理とキャッシュ更新
 */
export interface UseSocialNotificationsReturn {
  // データ取得
  notifications: SocialNotificationItem[]
  unreadCount: number
  isLoading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  refetch: () => void
  // キャッシュ操作
  markAllRead: () => Promise<boolean>
  invalidateNotifications: () => void
}

export function useSocialNotifications(): UseSocialNotificationsReturn {
  const queryClient = useQueryClient()
  const queryKey = [...queryKeys.social.all, 'notifications']
  const [unreadCount, setUnreadCount] = useState(0)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        const result = await getSocialNotifications(pageParam)
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        // 初回ロード時のみunreadCountを設定
        if (!pageParam) {
          setUnreadCount(result.value.unreadCount)
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

  // 全て既読にする
  const markAllRead = useCallback(async (): Promise<boolean> => {
    const result = await markAllAsRead()
    if (!result.ok) {
      return false
    }

    // キャッシュを更新
    queryClient.setQueryData<NotificationsQueryData>(queryKey, (oldData) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          items: page.items.map((n) => ({ ...n, isRead: true })),
        })),
      }
    })
    setUnreadCount(0)
    return true
  }, [queryClient, queryKey])

  // キャッシュ無効化
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    notifications,
    unreadCount,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage: () => fetchNextPage(),
    isFetchingNextPage,
    refetch: () => refetch(),
    markAllRead,
    invalidateNotifications,
  }
}
