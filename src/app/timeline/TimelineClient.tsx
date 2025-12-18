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
  const carouselDateChangeRef = useRef<((date: Date) => void) | null>(null)
  const syncSourceRef = useRef<'carousel' | 'timeline' | null>(null)
  const [, startTransition] = useTransition()

  // ヘッダーの日付変更（カルーセルスライド）→ TimelineListをスクロール
  const handleDateChange = useCallback((date: Date) => {
    if (syncSourceRef.current === 'timeline') return // TimelineListからの同期中は無視
    syncSourceRef.current = 'carousel'
    setCurrentDate(date)
    scrollToDateRef.current?.(date)
    requestAnimationFrame(() => {
      syncSourceRef.current = null
    })
  }, [])

  // TimelineListのスクロールで日付が変わった時 → カルーセルも同期
  const handleScrollDateChange = useCallback((date: Date) => {
    if (syncSourceRef.current === 'carousel') return // カルーセルからの同期中は無視
    syncSourceRef.current = 'timeline'
    startTransition(() => {
      setCurrentDate(date)
    })
    carouselDateChangeRef.current?.(date)
    requestAnimationFrame(() => {
      syncSourceRef.current = null
    })
  }, [])

  return (
    <QueryProvider>
      <div className="flex h-dvh flex-col">
        <DateHeader
          currentDate={currentDate}
          activeDates={activeDates}
          onDateChange={handleDateChange}
          onToggleCalendar={() => setIsCalendarOpen(!isCalendarOpen)}
          externalDateChangeRef={carouselDateChangeRef}
        />

        <main className="flex-1 overflow-hidden">
          <TimelineList
            userId={userId}
            onDateChange={handleScrollDateChange}
            onActiveDatesChange={setActiveDates}
            scrollToDateRef={scrollToDateRef}
          />
        </main>

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
