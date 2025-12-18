'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export interface DateHeaderProps {
  currentDate: Date
  activeDates?: Set<string> // 記録がある日付（YYYY-MM-DD形式）
  onDateChange?: (date: Date) => void
  onToggleCalendar?: () => void
}

export function DateHeader({
  currentDate,
  activeDates,
  onDateChange,
  onToggleCalendar,
}: DateHeaderProps) {
  // 前後2日を含む5日間の日付を生成
  const getDates = () => {
    const dates: Date[] = []
    for (let i = -2; i <= 2; i++) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const dates = getDates()
  const monthStr = format(currentDate, 'M月', { locale: ja })

  // 日付をタップしてジャンプ
  const handleDateClick = (date: Date) => {
    onDateChange?.(date)
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* 左: ロゴ */}
      <span className="text-lg font-bold text-gray-900">ヒビオル</span>

      {/* 中央: 日付5日間 */}
      <div className="flex items-center gap-1">
        {dates.map((date, index) => {
          const day = date.getDate()
          const isCenter = index === 2
          const dateKey = format(date, 'yyyy-MM-dd')
          const isActive = !activeDates || activeDates.has(dateKey)

          return (
            <button
              key={date.toISOString()}
              onClick={() => isActive && handleDateClick(date)}
              disabled={!isActive}
              className={`min-w-[28px] rounded px-1 py-0.5 text-center text-sm ${
                isCenter
                  ? 'bg-gray-900 font-bold text-white'
                  : isActive
                    ? 'text-gray-500 hover:bg-gray-100'
                    : 'cursor-not-allowed text-gray-300'
              }`}
              aria-label={format(date, 'M月d日', { locale: ja })}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* 右: 月（カレンダーボタン） */}
      <button
        onClick={onToggleCalendar}
        className="text-sm text-gray-600 hover:text-gray-900"
        aria-label="カレンダーを開く"
      >
        {monthStr}
      </button>
    </header>
  )
}
