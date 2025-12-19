'use client'

import { useState, useEffect } from 'react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import { format } from 'date-fns'
import { Spool, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCalendarData } from '../hooks/use-calendar-data'
import { useTimelineStore } from '../stores/timeline-store'
import 'react-day-picker/dist/style.css'

export interface MonthCalendarProps {
  userId: string
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function MonthCalendar({
  userId,
  selectedDate,
  onSelectDate,
}: MonthCalendarProps) {
  // Zustandストアからカレンダー開閉状態を取得
  const isOpen = useTimelineStore((s) => s.isCalendarOpen)
  const closeCalendar = useTimelineStore((s) => s.closeCalendar)
  // 表示中の月を管理（DayPickerの月切り替えに対応）
  const [displayMonth, setDisplayMonth] = useState(selectedDate)

  // カレンダーが開かれた時に、選択中の日付の月を表示
  useEffect(() => {
    if (isOpen) {
      setDisplayMonth(selectedDate)
    }
  }, [isOpen, selectedDate])

  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth() + 1

  const { days, isLoading } = useCalendarData({ userId, year, month })

  if (!isOpen) return null

  // 各カテゴリの日付を抽出
  const entryDays = days.filter((d) => d.hasEntry).map((d) => new Date(d.date))
  const hotsureDays = days.filter((d) => d.hasHotsure).map((d) => new Date(d.date))
  const streakStartDays = days.filter((d) => d.isStreakStart).map((d) => new Date(d.date))
  const streakMiddleDays = days.filter((d) => d.isStreakMiddle).map((d) => new Date(d.date))
  const streakEndDays = days.filter((d) => d.isStreakEnd).map((d) => new Date(d.date))
  const streakSingleDays = days.filter((d) => d.isStreakSingle).map((d) => new Date(d.date))

  // 記録がない日（クリック不可）
  const noEntryDays = days
    .filter((d) => !d.hasEntry && !d.hasHotsure)
    .map((d) => new Date(d.date))

  // 今日
  const today = days.find((d) => d.isToday)?.date
    ? new Date(days.find((d) => d.isToday)!.date)
    : undefined

  // ほつれ使用日のセット（高速検索用）
  const hotsureDateSet = new Set(days.filter((d) => d.hasHotsure).map((d) => d.date))

  // カスタムDayButtonコンポーネント
  function CustomDayButton(props: DayButtonProps) {
    const { day, modifiers, ...buttonProps } = props
    const dateStr = format(day.date, 'yyyy-MM-dd')
    const hasHotsure = hotsureDateSet.has(dateStr)

    // 連続線用のクラスを決定
    let streakClass = ''
    if (modifiers.streakStart) streakClass = 'streak-line streak-start'
    else if (modifiers.streakMiddle) streakClass = 'streak-line streak-middle'
    else if (modifiers.streakEnd) streakClass = 'streak-line streak-end'
    else if (modifiers.streakSingle) streakClass = 'streak-line streak-single'

    // 記録あり/なしのクラス
    const entryClass = modifiers.entry ? 'calendar-entry' : ''
    const disabledClass = modifiers.disabled ? 'calendar-disabled' : ''
    const todayClass = modifiers.today ? 'calendar-today' : ''
    const selectedClass = modifiers.selected ? 'calendar-selected' : ''

    return (
      <button
        {...buttonProps}
        className={`calendar-day ${streakClass} ${entryClass} ${disabledClass} ${todayClass} ${selectedClass} ${buttonProps.className || ''}`}
      >
        {modifiers.today && <span className="today-dot" />}
        <span>{day.date.getDate()}</span>
        {hasHotsure && (
          <span className="hotsure-icon">
            <Spool size={20} strokeWidth={2} className="text-primary" />
          </span>
        )}
      </button>
    )
  }

  // カスタムChevronコンポーネント
  function CustomChevron({
    orientation,
  }: {
    orientation?: 'left' | 'right' | 'up' | 'down'
  }) {
    if (orientation === 'left') {
      return <ChevronLeft size={20} className="text-accent-400" />
    }
    return <ChevronRight size={20} className="text-accent-400" />
  }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={closeCalendar} />

      {/* カレンダー */}
      <div className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="relative">
          {/* スケルトンオーバーレイ */}
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-card">
              <Skeleton className="h-full w-full rounded bg-muted" />
            </div>
          )}

          {/* DayPicker（常にレンダリングしてサイズを確保） */}
          <div className={isLoading ? 'invisible' : ''}>
            <DayPicker
              mode="single"
              selected={selectedDate}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              onSelect={(date) => {
                if (date) {
                  onSelectDate(date)
                  closeCalendar()
                }
              }}
              locale={ja}
              disabled={noEntryDays}
              fixedWeeks={true}
              modifiers={{
                entry: entryDays,
                hotsure: hotsureDays,
                streakStart: streakStartDays,
                streakMiddle: streakMiddleDays,
                streakEnd: streakEndDays,
                streakSingle: streakSingleDays,
                today: today ? [today] : [],
              }}
              components={{
                DayButton: CustomDayButton,
                Chevron: CustomChevron,
              }}
              classNames={{
                month: 'calendar-month',
              }}
            />
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-400"></span>
            <span>今日</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1 w-6 rounded-full bg-primary-300"></span>
            <span>記録あり</span>
          </div>
          <div className="flex items-center gap-2">
            <Spool size={16} className="text-primary" />
            <span>ほつれ使用</span>
          </div>
        </div>
      </div>
    </>
  )
}
