'use client'

import { useRef, useCallback, useEffect } from 'react'
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
import { useAllEntryDates } from '@/features/timeline/hooks/use-all-entry-dates'
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

  // Zustandストアから状態取得
  const currentDate = useTimelineStore((s) => s.currentDate)
  const activeDates = useTimelineStore((s) => s.activeDates) // 読み込み済みデータ判定用
  const syncSource = useTimelineStore((s) => s.syncSource)
  const setCurrentDate = useTimelineStore((s) => s.setCurrentDate)
  const setSyncSource = useTimelineStore((s) => s.setSyncSource)

  // 全期間の投稿日付を取得（カルーセル用）
  const { entryDates, hotsureDates } = useAllEntryDates({ userId })

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
  const loadAndScrollToDateRef = useRef<((date: Date) => Promise<void>) | null>(null)
  const carouselDateChangeRef = useRef<((date: Date) => void) | null>(null)
  const prefetchDaysRef = useRef<((date: Date, days: number) => Promise<void>) | null>(null)
  // 同期フラグのクリアタイマー（高速操作時の同期漏れを防止）
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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

        // 既存タイマーをクリア（高速操作時の競合を防止）
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
        }

        setSyncSource('carousel')
        setCurrentDate(date)
        scrollToDateRef.current?.(date)
        clearUrlParam()

        // 100ms後にクリア（スクロール完了を待つ）
        syncTimeoutRef.current = setTimeout(() => {
          setSyncSource(null)
        }, 100)

        // 先読み: すぐに-4日分を読み込み
        prefetchDaysRef.current?.(date, 4)
      } else {
        // 未読み込み → データを読み込んでからスクロール
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
        }

        setSyncSource('carousel')
        setCurrentDate(date)

        // 読み込んでからスクロール
        loadAndScrollToDateRef.current?.(date).then(() => {
          carouselDateChangeRef.current?.(date)
          syncTimeoutRef.current = setTimeout(() => {
            setSyncSource(null)
          }, 100)

          // 先読み: すぐに-4日分を読み込み
          prefetchDaysRef.current?.(date, 4)
        })
      }
    },
    [activeDates, syncSource, clearUrlParam, setSyncSource, setCurrentDate]
  )

  // TimelineListのスクロールで日付が変わった時 → カルーセルも同期
  const handleScrollDateChange = useCallback(
    (date: Date) => {
      if (syncSource === 'carousel') return // カルーセルからの同期中は無視

      setCurrentDate(date)
      carouselDateChangeRef.current?.(date)
      clearUrlParam()
    },
    [syncSource, clearUrlParam, setCurrentDate]
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <DateHeader
        currentDate={currentDate}
        entryDates={entryDates}
        hotsureDates={hotsureDates}
        onDateChange={handleDateChange}
        externalDateChangeRef={carouselDateChangeRef}
      />

      <main className="flex-1 overflow-hidden">
        <TimelineList
          userId={userId}
          initialDate={initialDate ? parsedInitialDate : undefined}
          onDateChange={handleScrollDateChange}
          scrollToDateRef={scrollToDateRef}
          loadAndScrollToDateRef={loadAndScrollToDateRef}
          prefetchDaysRef={prefetchDaysRef}
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
