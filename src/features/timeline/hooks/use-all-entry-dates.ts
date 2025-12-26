'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchAllEntryDates } from '../api/queries'

export interface UseAllEntryDatesOptions {
  userId: string
}

export interface UseAllEntryDatesReturn {
  entryDates: Set<string>
  hotsureDates: Set<string>
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * 全期間の投稿日付を取得するフック（カルーセル用）
 * 日付のみを取得するため軽量
 */
export function useAllEntryDates(
  options: UseAllEntryDatesOptions
): UseAllEntryDatesReturn {
  const { userId } = options

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['all-entry-dates', userId],
    queryFn: () => fetchAllEntryDates({ userId }),
    staleTime: 5 * 60 * 1000, // 5分間はstaleにしない
    gcTime: 30 * 60 * 1000, // 30分間キャッシュ保持
  })

  return {
    entryDates: new Set(data?.entryDates ?? []),
    hotsureDates: new Set(data?.hotsureDates ?? []),
    isLoading,
    isError,
    error: error as Error | null,
    refetch: async () => {
      await refetch()
    },
  }
}
