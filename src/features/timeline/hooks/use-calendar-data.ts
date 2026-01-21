'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { fetchCalendarDataAction } from '../api/actions'
import type { CalendarDayData } from '../types'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from 'date-fns'

export interface UseCalendarDataOptions {
  userId: string
  year: number
  month: number // 1-12
}

export interface UseCalendarDataReturn {
  days: CalendarDayData[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCalendarData(
  options: UseCalendarDataOptions
): UseCalendarDataReturn {
  const { userId, year, month } = options
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.entries.calendar(userId, year, month),
    queryFn: async () => {
      const result = await fetchCalendarDataAction({ year, month })
      if (result?.serverError) {
        throw new Error(result.serverError)
      }
      if (!result?.data) {
        throw new Error('カレンダーデータの取得に失敗しました')
      }
      return result.data
    },
    // カレンダーは日次更新なので中程度のstaleTime
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分（月移動時のキャッシュ保持）
  })

  // 前後月のプリフェッチ（月切り替え時のちらつき防止）
  useEffect(() => {
    const prefetchMonth = (y: number, m: number) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.entries.calendar(userId, y, m),
        queryFn: async () => {
          const result = await fetchCalendarDataAction({ year: y, month: m })
          if (result?.serverError) {
            throw new Error(result.serverError)
          }
          if (!result?.data) {
            throw new Error('カレンダーデータの取得に失敗しました')
          }
          return result.data
        },
        staleTime: 5 * 60 * 1000, // 5分間はstaleにしない
      })
    }

    // 前月（年またぎ対応）
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    prefetchMonth(prevYear, prevMonth)

    // 次月（年またぎ対応）
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    prefetchMonth(nextYear, nextMonth)
  }, [queryClient, userId, year, month])

  // 月の全日付を生成
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 各日付の基本データを生成
  const baseDays = allDaysInMonth.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const hasEntry = data?.entryDates.includes(dateStr) ?? false
    const hasHotsure = data?.hotsureDates.includes(dateStr) ?? false
    // 記録がある日のみを「アクティブ」とみなす（ほつれ使用日は記録なし扱い）
    const isActive = hasEntry

    return {
      date: dateStr,
      hasEntry,
      hasHotsure,
      isToday: isToday(day),
      isActive,
    }
  })

  // 連続記録の位置を判定
  const days: CalendarDayData[] = baseDays.map((day, index) => {
    const { isActive, ...rest } = day

    // 前後の日のアクティブ状態を取得
    const prevIsActive = index > 0 ? baseDays[index - 1].isActive : false
    const nextIsActive = index < baseDays.length - 1 ? baseDays[index + 1].isActive : false

    // 連続の位置を判定
    let isStreakStart = false
    let isStreakMiddle = false
    let isStreakEnd = false
    let isStreakSingle = false

    if (isActive) {
      if (!prevIsActive && !nextIsActive) {
        // 前後どちらも記録なし → 単独
        isStreakSingle = true
      } else if (!prevIsActive && nextIsActive) {
        // 前なし・後あり → 開始
        isStreakStart = true
      } else if (prevIsActive && nextIsActive) {
        // 前後両方あり → 中間
        isStreakMiddle = true
      } else if (prevIsActive && !nextIsActive) {
        // 前あり・後なし → 終了
        isStreakEnd = true
      }
    }

    return {
      ...rest,
      isStreakStart,
      isStreakMiddle,
      isStreakEnd,
      isStreakSingle,
    }
  })

  return {
    days,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: async () => {
      await refetch()
    },
  }
}
