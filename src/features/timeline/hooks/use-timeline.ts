'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
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

export function useTimeline(
  options: UseTimelineOptions
): UseTimelineReturn {
  const { userId, initialDate, pageSize = 20 } = options

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
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['timeline', userId, initialCursor],
    queryFn: ({ pageParam }) =>
      fetchEntries({
        userId,
        cursor: pageParam,
        limit: pageSize,
        direction: 'before',
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: initialCursor,
  })

  // 全ページのentriesをフラット化
  const entries = data?.pages.flatMap((page) => page.entries) || []

  return {
    entries,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    hasPreviousPage: false, // 今日から過去へのスクロールのみ
    fetchNextPage: async () => {
      await fetchNextPage()
    },
    fetchPreviousPage: async () => {
      // 今回は実装しない（今日から過去へのスクロールのみ）
    },
    refetch: async () => {
      await refetch()
    },
  }
}
