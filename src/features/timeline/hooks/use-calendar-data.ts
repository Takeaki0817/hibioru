'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchCalendarData } from '../api/queries'
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar', userId, year, month],
    queryFn: () => fetchCalendarData({ userId, year, month }),
  })

  // 月の全日付を生成
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 各日付のデータを生成
  const days: CalendarDayData[] = allDaysInMonth.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const hasEntry = data?.entryDates.includes(dateStr) ?? false
    const hasHotsure = data?.hotsureDates.includes(dateStr) ?? false

    // 連続記録の判定（簡易版 - 実際はストリークロジックと連携）
    const dayIndex = allDaysInMonth.findIndex((d) => format(d, 'yyyy-MM-dd') === dateStr)
    const prevDay = dayIndex > 0 ? allDaysInMonth[dayIndex - 1] : null
    const prevDateStr = prevDay ? format(prevDay, 'yyyy-MM-dd') : null
    const prevHasEntry = prevDateStr ? (data?.entryDates.includes(prevDateStr) ?? false) : false
    const isStreakDay = hasEntry && (prevHasEntry || dayIndex === 0)

    return {
      date: dateStr,
      hasEntry,
      isStreakDay,
      hasHotsure,
      isToday: isToday(day),
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
