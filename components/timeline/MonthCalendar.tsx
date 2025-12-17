'use client'

import { DayPicker } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import { useCalendarData } from '@/hooks/timeline/useCalendarData'
import 'react-day-picker/dist/style.css'

export interface MonthCalendarProps {
  userId: string
  isOpen: boolean
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
}

export function MonthCalendar({
  userId,
  isOpen,
  selectedDate,
  onSelectDate,
  onClose,
}: MonthCalendarProps) {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth() + 1

  const { days, isLoading } = useCalendarData({ userId, year, month })

  if (!isOpen) return null

  // 記録がある日を抽出
  const entryDays = days.filter((d) => d.hasEntry).map((d) => new Date(d.date))
  // 今日
  const today = days.find((d) => d.isToday)?.date
    ? new Date(days.find((d) => d.isToday)!.date)
    : undefined

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
      />

      {/* カレンダー */}
      <div className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onSelectDate(date)
                onClose()
              }
            }}
            locale={ja}
            modifiers={{
              entry: entryDays,
              today: today ? [today] : [],
            }}
            modifiersStyles={{
              entry: {
                fontWeight: 'bold',
                textDecoration: 'underline',
              },
              today: {
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
              },
            }}
          />
        )}

        {/* 凡例 */}
        <div className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500"></span>
            <span>今日</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-bold underline">●</span>
            <span>記録あり</span>
          </div>
        </div>
      </div>
    </>
  )
}
