'use client'

import { useState, useMemo } from 'react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Spool } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useCalendarData } from '../hooks/use-calendar-data'
import { useTimelineStore } from '../stores/timeline-store'
import 'react-day-picker/dist/style.css'

// 静的な凡例JSXをモジュールレベルでホイスト（再レンダー時の再生成を防止）
const CALENDAR_LEGEND = (
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
      <Spool className="h-3 w-3 text-primary-400" />
      <span>ほつれ</span>
    </div>
  </div>
)

// カスタムDayButtonコンポーネント
function CustomDayButton(props: DayButtonProps) {
  const { day, modifiers, ...buttonProps } = props

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
  const hotsureClass = modifiers.hotsure ? 'calendar-hotsure' : ''

  return (
    <button
      {...buttonProps}
      className={cn(
        'calendar-day',
        streakClass,
        entryClass,
        disabledClass,
        todayClass,
        selectedClass,
        hotsureClass,
        buttonProps.className
      )}
    >
      {modifiers.today && <span className="today-dot" />}
      {modifiers.hotsure && (
        <Spool className="absolute -right-0.5 -top-0.5 h-3 w-3 text-primary-400" />
      )}
      <span>{day.date.getDate()}</span>
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

  // カレンダーが開かれた時に、選択中の日付の月を表示（レンダー中の状態調整パターン）
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen && !wasOpen) {
    setWasOpen(true)
    setDisplayMonth(selectedDate)
  } else if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth() + 1

  const { days, isLoading } = useCalendarData({ userId, year, month })

  // 各カテゴリの日付を一括で抽出（依存配列チェックを1回に削減）
  const calendarCategories = useMemo(() => {
    const entryDays: Date[] = []
    const streakStartDays: Date[] = []
    const streakMiddleDays: Date[] = []
    const streakEndDays: Date[] = []
    const streakSingleDays: Date[] = []
    const hotsureDays: Date[] = []
    const noEntryDays: Date[] = []
    let today: Date | undefined

    for (const d of days) {
      const dateObj = new Date(d.date)

      if (d.hasEntry) entryDays.push(dateObj)
      else noEntryDays.push(dateObj)

      if (d.hasHotsure) hotsureDays.push(dateObj)
      if (d.isStreakStart) streakStartDays.push(dateObj)
      if (d.isStreakMiddle) streakMiddleDays.push(dateObj)
      if (d.isStreakEnd) streakEndDays.push(dateObj)
      if (d.isStreakSingle) streakSingleDays.push(dateObj)
      if (d.isToday) today = dateObj
    }

    return {
      entryDays,
      streakStartDays,
      streakMiddleDays,
      streakEndDays,
      streakSingleDays,
      hotsureDays,
      noEntryDays,
      today,
    }
  }, [days])

  const { noEntryDays, today } = calendarCategories

  // DayPickerモディファイアをメモ化（毎レンダーでのオブジェクト再生成を防止）
  const modifiers = useMemo(
    () => ({
      entry: calendarCategories.entryDays,
      streakStart: calendarCategories.streakStartDays,
      streakMiddle: calendarCategories.streakMiddleDays,
      streakEnd: calendarCategories.streakEndDays,
      streakSingle: calendarCategories.streakSingleDays,
      hotsure: calendarCategories.hotsureDays,
      today: today ? [today] : [],
    }),
    [calendarCategories, today]
  )

  if (!isOpen) return null

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
              modifiers={modifiers}
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
        {CALENDAR_LEGEND}
      </div>
    </>
  )
}
