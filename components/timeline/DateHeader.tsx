'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useSwipeNavigation } from '@/hooks/timeline/useSwipeNavigation'

export interface DateHeaderProps {
  currentDate: Date
  hasHotsure?: boolean
  onDateChange?: (date: Date) => void
  onToggleCalendar?: () => void
}

export function DateHeader({
  currentDate,
  hasHotsure = false,
  onDateChange,
  onToggleCalendar,
}: DateHeaderProps) {
  // 前日・翌日へ移動
  const handlePrevDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange?.(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange?.(newDate)
  }

  // スワイプジェスチャー
  const { handlers } = useSwipeNavigation({
    onSwipeLeft: handleNextDay,
    onSwipeRight: handlePrevDay,
  })

  // 日付フォーマット: YYYY年MM月DD日（曜日）
  const dateStr = format(currentDate, 'yyyy年MM月dd日（E）', { locale: ja })

  return (
    <div
      {...handlers}
      className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      <button
        onClick={handlePrevDay}
        className="text-gray-600 hover:text-gray-900"
        aria-label="前の日"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-lg font-medium">{dateStr}</span>
        {hasHotsure && <span className="text-xl">🧵</span>}
      </div>

      <button
        onClick={onToggleCalendar}
        className="text-gray-600 hover:text-gray-900"
        aria-label="カレンダーを開く"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  )
}
