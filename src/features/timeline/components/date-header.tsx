'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimelineStore } from '../stores/timeline-store'
import { useDateCarousel } from '../hooks/use-date-carousel'
import { DateCarousel } from './date-carousel'
import { Logo } from '@/components/brand/logo'

export interface DateHeaderProps {
  currentDate: Date
  // 投稿がある日付（全期間、スキップ判定用）
  entryDates?: Set<string>
  // ほつれ使用日（アイコン表示用）
  hotsureDates?: Set<string>
  onDateChange?: (date: Date) => void
  // 外部からの日付変更を受け付けるref
  externalDateChangeRef?: React.MutableRefObject<((date: Date) => void) | null>
}

export function DateHeader({
  currentDate,
  entryDates,
  hotsureDates,
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
    entryDates,
    onDateChange,
    externalDateChangeRef,
  })

  const monthStr = format(currentDate, 'M月', { locale: ja })

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-2.5 md:px-4">
        {/* 左: ロゴ */}
        <h1 className="text-foreground">
          <Logo className="w-24 h-auto" />
          <span className="sr-only">ヒビオル</span>
        </h1>

        {/* 中央: カルーセル日付 */}
        <DateCarousel
          dates={dates}
          selectedIndex={selectedIndex}
          entryDates={entryDates}
          hotsureDates={hotsureDates}
          centerIndex={centerIndex}
          setApi={setApi}
          onDateClick={handleDateClick}
        />

        {/* 右: 月（カレンダーボタン）- ロゴと同じ幅でカルーセルを中央に配置 */}
        <div className="w-24 flex justify-end">
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
      </div>
    </header>
  )
}
