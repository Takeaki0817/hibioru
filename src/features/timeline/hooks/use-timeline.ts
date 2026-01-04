'use client'

import { useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { fetchEntries } from '../api/queries'
import type { TimelineEntry } from '../types'

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

  // initialDateが指定されている場合、その日付の翌日0:00をcursorとして使用
  // これにより、その日付を含むデータから取得を開始する
  const initialCursor = initialDate
    ? new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        initialDate.getDate() + 1,
        0,
        0,
        0
      ).toISOString()
    : undefined

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
    queryKey: queryKeys.entries.timeline(userId, initialCursor),
    queryFn: ({ pageParam }) =>
      fetchEntries({
        userId,
        cursor: pageParam.cursor,
        limit: pageSize,
        direction: pageParam.direction,
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
  })

  // 全ページのentriesをフラット化
  const entries = data?.pages.flatMap((page) => page.entries) || []

  // 次ページを自動プリフェッチ（UX向上）
  // hasNextPageがtrueの場合、バックグラウンドで次ページをプリフェッチ
  const nextCursor = data?.pages[data.pages.length - 1]?.nextCursor
  useEffect(() => {
    if (hasNextPage && nextCursor) {
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.entries.timeline(userId, nextCursor),
        queryFn: ({ pageParam }) =>
          fetchEntries({
            userId,
            cursor: pageParam.cursor,
            limit: pageSize,
            direction: pageParam.direction,
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
