'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
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
import { queryKeys } from '@/lib/constants/query-keys'
import { convertToTimelineEntry } from '@/features/timeline/types'
import type { TimelinePage } from '@/features/timeline/types'
import type { Entry } from '@/lib/types/database'

export interface TimelineClientProps {
  userId: string
  initialEntries: Entry[]
  initialDate?: string // YYYY-MM-DD形式
}

// 内部コンポーネント（Providerの中で使用）
function TimelineContent({
  userId,
  initialEntries,
  initialDate,
}: {
  userId: string
  initialEntries: Entry[]
  initialDate?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Zustandストアから状態取得
  const currentDate = useTimelineStore((s) => s.currentDate)
  const syncSource = useTimelineStore((s) => s.syncSource)
  const setCurrentDate = useTimelineStore((s) => s.setCurrentDate)
  const setSyncSource = useTimelineStore((s) => s.setSyncSource)

  // SSRで取得したinitialEntriesをクライアント側のキャッシュにセット
  // 楽観的更新が既に存在する場合は、それを優先する（SSRデータを無視）
  useEffect(() => {
    const initialCursor = initialDate
      ? new Date(
          new Date(initialDate).getFullYear(),
          new Date(initialDate).getMonth(),
          new Date(initialDate).getDate() + 1,
          0,
          0,
          0
        ).toISOString()
      : undefined

    const timelineKey = queryKeys.entries.timeline(userId, initialCursor)
    const existingCache =
      queryClient.getQueryData<InfiniteData<TimelinePage>>(timelineKey)

    // 既存のキャッシュがある場合、楽観的エントリ（IDが`optimistic-`で始まる）を確認
    if (existingCache?.pages?.[0]) {
      const firstPage = existingCache.pages[0]
      const hasOptimisticEntry = firstPage.entries.some((e) =>
        e.id.startsWith('optimistic-')
      )

      // 楽観的エントリがある場合は、SSRデータを無視（楽観的更新を優先）
      if (hasOptimisticEntry) {
        return
      }
    }

    // initialEntriesが空の場合は、既存のキャッシュがあればそのまま使用
    if (initialEntries.length === 0) {
      return
    }

    // 既存のキャッシュがない場合、または楽観的エントリがない場合は、SSRデータをセット
    const timelineEntries = initialEntries.map(convertToTimelineEntry)
    const timelinePage: TimelinePage = {
      entries: timelineEntries,
      nextCursor:
        timelineEntries.length > 0
          ? timelineEntries[timelineEntries.length - 1].createdAt.toISOString()
          : null,
      prevCursor:
        timelineEntries.length > 0
          ? timelineEntries[0].createdAt.toISOString()
          : null,
    }

    queryClient.setQueryData<InfiniteData<TimelinePage>>(timelineKey, {
      pages: [timelinePage],
      pageParams: [{ cursor: initialCursor, direction: 'before' }],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // マウント時のみ実行（SSRデータの初期セットのみ）

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
  const loadAndScrollToDateRef = useRef<((date: Date) => Promise<void>) | null>(
    null
  )
  const carouselDateChangeRef = useRef<((date: Date) => void) | null>(null)
  // 同期フラグのクリアタイマー（高速操作時の同期漏れを防止）
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

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
  // 常にloadAndScrollToDateを使用し、DOM存在チェックを確実に行う
  const handleDateChange = useCallback(
    (date: Date) => {
      // 既存タイマーをクリア（高速操作時の競合を防止）
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      setSyncSource('carousel')
      setCurrentDate(date)

      // loadAndScrollToDateは内部でDOM待機 + 先読みを行うため、
      // スクロール後のDOM変化によるずれが発生しない
      loadAndScrollToDateRef.current?.(date).then(() => {
        carouselDateChangeRef.current?.(date)
        clearUrlParam()

        // スクロール完了後にsyncSourceを解除
        syncTimeoutRef.current = setTimeout(() => {
          setSyncSource(null)
        }, 100)
      })
    },
    [clearUrlParam, setSyncSource, setCurrentDate]
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
        <div className="container mx-auto max-w-2xl h-full">
          <TimelineList
            userId={userId}
            initialDate={initialDate ? parsedInitialDate : undefined}
            onDateChange={handleScrollDateChange}
            scrollToDateRef={scrollToDateRef}
            loadAndScrollToDateRef={loadAndScrollToDateRef}
          />
        </div>
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
export function TimelineClient({
  userId,
  initialEntries,
  initialDate,
}: TimelineClientProps) {
  return (
    <QueryProvider>
      <TimelineStoreProvider>
        <TimelineContent
          userId={userId}
          initialEntries={initialEntries}
          initialDate={initialDate}
        />
      </TimelineStoreProvider>
    </QueryProvider>
  )
}
