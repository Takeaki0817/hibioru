'use client'

import { useRef, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { DateHeader } from '@/features/timeline/components/date-header'
import { MonthCalendar } from '@/features/timeline/components/month-calendar'
import { TimelineList } from '@/features/timeline/components/timeline-list'
import { FooterNav } from '@/components/layouts/footer-nav'
import {
  TimelineStoreProvider,
  useTimelineStore,
  useTimelineStoreApi,
} from '@/features/timeline/stores/timeline-store'
import type { Entry } from '@/lib/types/database'

export interface TimelineClientProps {
  userId: string
  initialEntries: Entry[]
  initialDate?: string // YYYY-MM-DD形式
}

// 内部コンポーネント（Providerの中で使用）
function TimelineContent({
  userId,
  initialDate,
}: {
  userId: string
  initialDate?: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Zustandストアから状態取得
  const currentDate = useTimelineStore((s) => s.currentDate)
  const activeDates = useTimelineStore((s) => s.activeDates)
  const syncSource = useTimelineStore((s) => s.syncSource)
  const setCurrentDate = useTimelineStore((s) => s.setCurrentDate)
  const setSyncSource = useTimelineStore((s) => s.setSyncSource)

  // ストアAPIに直接アクセス（初期化用）
  const storeApi = useTimelineStoreApi()

  // 初期日付を解析
  const parsedInitialDate = initialDate ? new Date(initialDate) : new Date()

  // 初期日付をストアに設定
  useEffect(() => {
    storeApi.setState({ currentDate: parsedInitialDate })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // スクロール制御用ref（子コンポーネントから関数を受け取る）
  const scrollToDateRef = useRef<((date: Date) => void) | null>(null)
  const carouselDateChangeRef = useRef<((date: Date) => void) | null>(null)

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
        if (syncSource === 'timeline') return
        setSyncSource('carousel')
        setCurrentDate(date)
        scrollToDateRef.current?.(date)
        clearUrlParam()
        requestAnimationFrame(() => {
          setSyncSource(null)
        })
      } else {
        // 未読み込み → URLパラメータで遷移（ページがその日付から読み込み開始）
        router.push(`/timeline?date=${dateStr}`)
      }
    },
    [activeDates, syncSource, router, clearUrlParam, setSyncSource, setCurrentDate]
  )

  // TimelineListのスクロールで日付が変わった時 → カルーセルも同期
  const handleScrollDateChange = useCallback(
    (date: Date) => {
      if (syncSource === 'carousel') return // カルーセルからの同期中は無視
      setSyncSource('timeline')
      startTransition(() => {
        setCurrentDate(date)
      })
      carouselDateChangeRef.current?.(date)
      clearUrlParam()
      requestAnimationFrame(() => {
        setSyncSource(null)
      })
    },
    [syncSource, clearUrlParam, setSyncSource, setCurrentDate]
  )

  return (
    <div className="flex h-dvh flex-col">
      <DateHeader
        currentDate={currentDate}
        activeDates={activeDates}
        onDateChange={handleDateChange}
        externalDateChangeRef={carouselDateChangeRef}
      />

      <main className="flex-1 overflow-hidden">
        <TimelineList
          userId={userId}
          initialDate={initialDate ? parsedInitialDate : undefined}
          onDateChange={handleScrollDateChange}
          scrollToDateRef={scrollToDateRef}
        />
      </main>

      <MonthCalendar
        userId={userId}
        selectedDate={currentDate}
        onSelectDate={handleDateChange}
      />

      <FooterNav />
    </div>
  )
}

// メインコンポーネント（Providerでラップ）
export function TimelineClient({ userId, initialDate }: TimelineClientProps) {
  return (
    <QueryProvider>
      <TimelineStoreProvider>
        <TimelineContent userId={userId} initialDate={initialDate} />
      </TimelineStoreProvider>
    </QueryProvider>
  )
}
