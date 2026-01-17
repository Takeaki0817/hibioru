'use client'

import { useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getJSTDayBounds } from '@/lib/date-utils'
import { fetchEntries } from '../api/queries'
import type { TimelineEntry, TimelinePage } from '../types'

export interface UseTimelineOptions {
  userId: string
  initialDate?: Date
  pageSize?: number
}

export interface UseTimelineReturn {
  entries: TimelineEntry[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  hasNextPage: boolean
  hasPreviousPage: boolean
  fetchNextPage: () => Promise<void>
  fetchPreviousPage: () => Promise<void>
  refetch: () => Promise<void>
}

// ページパラメータの型（双方向ページネーション用）
interface PageParam {
  cursor: string | undefined
  direction: 'before' | 'after'
}

export function useTimeline(options: UseTimelineOptions): UseTimelineReturn {
  const { userId, initialDate, pageSize = 20 } = options
  const queryClient = useQueryClient()

  // initialDateが指定されている場合、その日付の翌日0:00(JST)をcursorとして使用
  // これにより、その日付を含むデータから取得を開始する
  const initialCursor = initialDate
    ? getJSTDayBounds(initialDate).end.toISOString()
    : undefined

  // 既存のキャッシュがあれば初期データとして使用（ローディング状態を回避）
  const queryKey = queryKeys.entries.timeline(userId, initialCursor)
  const existingData = queryClient.getQueryData<InfiniteData<TimelinePage>>(queryKey)

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: ({ pageParam }) =>
      fetchEntries({
        userId,
        cursor: (pageParam as PageParam).cursor,
        limit: pageSize,
        direction: (pageParam as PageParam).direction,
      }),
    // タイムラインは更新頻度が低いため長めのstaleTime
    staleTime: 10 * 60 * 1000, // 10分
    // 過去方向（古いデータ）
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor
        ? { cursor: lastPage.nextCursor, direction: 'before' as const }
        : undefined,
    // 未来方向（新しいデータ）
    getPreviousPageParam: (firstPage) =>
      firstPage.prevCursor
        ? { cursor: firstPage.prevCursor, direction: 'after' as const }
        : undefined,
    initialPageParam: { cursor: initialCursor, direction: 'before' } as PageParam,
    // 既存キャッシュがあれば初期データとして使用（ローディング状態を回避）
    initialData: existingData,
  })

  // 全ページのentriesをフラット化
  const entries = data?.pages.flatMap((page) => page.entries) || []

  // 次ページを自動プリフェッチ（UX向上）
  // hasNextPageがtrueの場合、バックグラウンドで次ページをプリフェッチ
  const nextCursor = data?.pages[data.pages.length - 1]?.nextCursor
  useEffect(() => {
    if (hasNextPage && nextCursor) {
      const prefetchKey = queryKeys.entries.timeline(userId, nextCursor)
      queryClient.prefetchInfiniteQuery({
        queryKey: prefetchKey,
        queryFn: ({ pageParam }) =>
          fetchEntries({
            userId,
            cursor: (pageParam as PageParam).cursor,
            limit: pageSize,
            direction: (pageParam as PageParam).direction,
          }),
        initialPageParam: { cursor: nextCursor, direction: 'before' } as PageParam,
        staleTime: 10 * 60 * 1000, // 10分
      })
    }
  }, [hasNextPage, nextCursor, userId, pageSize, queryClient])

  return {
    entries,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    hasPreviousPage: hasPreviousPage ?? false,
    fetchNextPage: async () => {
      await fetchNextPage()
    },
    fetchPreviousPage: async () => {
      await fetchPreviousPage()
    },
    refetch: async () => {
      await refetch()
    },
  }
}
