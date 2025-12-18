'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { DateHeader } from '@/features/timeline/components/date-header'
import { MonthCalendar } from '@/features/timeline/components/month-calendar'
import { TimelineList } from '@/features/timeline/components/timeline-list'
import { FooterNav } from '@/components/layouts/footer-nav'
import type { Entry } from '@/lib/types/database'

export interface TimelineClientProps {
  userId: string
  initialEntries: Entry[]
}

export function TimelineClient({ userId }: TimelineClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const scrollToDateRef = useRef<((date: Date) => void) | null>(null)
  const [, startTransition] = useTransition()

  // ヘッダーの日付をタップした時、TimelineListをスクロール
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date)
    scrollToDateRef.current?.(date)
  }, [])

  // TimelineListのスクロールで日付が変わった時（低優先度で更新）
  const handleScrollDateChange = useCallback((date: Date) => {
    startTransition(() => {
      setCurrentDate(date)
    })
  }, [])

  return (
    <QueryProvider>
      <div className="flex h-screen flex-col">
        <DateHeader
          currentDate={currentDate}
          activeDates={activeDates}
          onDateChange={handleDateChange}
          onToggleCalendar={() => setIsCalendarOpen(!isCalendarOpen)}
        />

        <div className="flex-1 overflow-hidden pb-20">
          <TimelineList
            userId={userId}
            onDateChange={handleScrollDateChange}
            onActiveDatesChange={setActiveDates}
            scrollToDateRef={scrollToDateRef}
          />
        </div>

        <MonthCalendar
          userId={userId}
          isOpen={isCalendarOpen}
          selectedDate={currentDate}
          onSelectDate={handleDateChange}
          onClose={() => setIsCalendarOpen(false)}
        />

        <FooterNav />
      </div>
    </QueryProvider>
  )
}
