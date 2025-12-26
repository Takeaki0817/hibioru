'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimelineStore } from '../stores/timeline-store'
import { useDateCarousel } from '../hooks/use-date-carousel'
import { DateCarousel } from './date-carousel'

export interface DateHeaderProps {
  currentDate: Date
  activeDates?: Set<string> // 記録がある日付（YYYY-MM-DD形式）
  onDateChange?: (date: Date) => void
  // 外部からの日付変更を受け付けるref
  externalDateChangeRef?: React.MutableRefObject<((date: Date) => void) | null>
}

export function DateHeader({
  currentDate,
  activeDates,
  onDateChange,
  externalDateChangeRef,
}: DateHeaderProps) {
  // Zustandストアからカレンダー開閉状態と関数を取得
  const isCalendarOpen = useTimelineStore((s) => s.isCalendarOpen)
  const toggleCalendar = useTimelineStore((s) => s.toggleCalendar)

  // カルーセルロジックをフックから取得
  const {
    setApi,
    dates,
    selectedIndex,
    handleDateClick,
    centerIndex,
  } = useDateCarousel({
    currentDate,
    activeDates,
    onDateChange,
    externalDateChangeRef,
  })

  const monthStr = format(currentDate, 'M月', { locale: ja })

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-400 items-center justify-between px-4">
        {/* 左: ロゴ */}
        <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">
          ヒビオル
        </h1>

        {/* 中央: カルーセル日付 */}
        <DateCarousel
          dates={dates}
          selectedIndex={selectedIndex}
          activeDates={activeDates}
          centerIndex={centerIndex}
          setApi={setApi}
          onDateClick={handleDateClick}
        />

        {/* 右: 月（カレンダーボタン） */}
        <button
          onClick={toggleCalendar}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            'text-sm font-medium',
            'text-primary-600 dark:text-primary-400',
            'bg-primary-100 hover:bg-primary-200',
            'dark:bg-primary-100 dark:hover:bg-primary-200',
            'transition-all active:scale-95'
          )}
          aria-label={isCalendarOpen ? 'カレンダーを閉じる' : 'カレンダーを開く'}
          aria-expanded={isCalendarOpen}
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          {monthStr}
        </button>
      </div>
    </header>
  )
}
