'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { DateHeader } from '@/features/timeline/components/date-header'
import { MonthCalendar } from '@/features/timeline/components/month-calendar'
import { TimelineList } from '@/features/timeline/components/timeline-list'
import { FooterNav } from '@/components/layouts/footer-nav'
import type { Entry } from '@/lib/types/database'

export interface TimelineClientProps {
  userId: string
  initialEntries: Entry[]
  initialDate?: string // YYYY-MM-DD形式
}

export function TimelineClient({ userId, initialDate }: TimelineClientProps) {
  const router = useRouter()

  // 初期日付を解析
  const parsedInitialDate = initialDate ? new Date(initialDate) : new Date()
  const [currentDate, setCurrentDate] = useState(parsedInitialDate)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const scrollToDateRef = useRef<((date: Date) => void) | null>(null)
  const carouselDateChangeRef = useRef<((date: Date) => void) | null>(null)
  const syncSourceRef = useRef<'carousel' | 'timeline' | null>(null)
  const [, startTransition] = useTransition()

  // initialDateが指定されている場合、その日付にスクロール
  useEffect(() => {
    if (initialDate && scrollToDateRef.current) {
      const targetDate = new Date(initialDate)
      // 少し遅延させてDOMが準備できてからスクロール
      const timer = setTimeout(() => {
        scrollToDateRef.current?.(targetDate)
        carouselDateChangeRef.current?.(targetDate)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialDate])

  // URLパラメータを削除（読み込み済みデータ内を移動中は不要）
  const clearUrlParam = useCallback(() => {
    if (initialDate) {
      router.replace('/timeline', { scroll: false })
    }
  }, [initialDate, router])

  // ヘッダーの日付変更（カルーセルスライド）→ TimelineListをスクロール
  const handleDateChange = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd')

      // 日付がタイムラインに読み込まれているか確認
      if (activeDates.has(dateStr)) {
        // 読み込み済み → スクロール＆URLパラメータ削除
        if (syncSourceRef.current === 'timeline') return
        syncSourceRef.current = 'carousel'
        setCurrentDate(date)
        scrollToDateRef.current?.(date)
        clearUrlParam()
        requestAnimationFrame(() => {
          syncSourceRef.current = null
        })
      } else {
        // 未読み込み → URLパラメータで遷移（ページがその日付から読み込み開始）
        router.push(`/timeline?date=${dateStr}`)
      }
    },
    [activeDates, router, clearUrlParam]
  )

  // TimelineListのスクロールで日付が変わった時 → カルーセルも同期
  const handleScrollDateChange = useCallback(
    (date: Date) => {
      if (syncSourceRef.current === 'carousel') return // カルーセルからの同期中は無視
      syncSourceRef.current = 'timeline'
      startTransition(() => {
        setCurrentDate(date)
      })
      carouselDateChangeRef.current?.(date)
      clearUrlParam()
      requestAnimationFrame(() => {
        syncSourceRef.current = null
      })
    },
    [clearUrlParam]
  )

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
            initialDate={initialDate ? parsedInitialDate : undefined}
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
