'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useTimeline } from '../hooks/use-timeline'
import { useDateDetection } from '../hooks/use-date-detection'
import { useInfiniteScroll } from '../hooks/use-infinite-scroll'
import { useTimelineGrouping } from '../hooks/use-timeline-grouping'
import { useInitialScroll } from '../hooks/use-initial-scroll'
import { useDateRefs } from '../hooks/use-date-refs'
import { EntryCard } from './entry-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimelineStore, useTimelineStoreApi } from '../stores/timeline-store'
import { TIMELINE_CONFIG } from '../constants'

const { DATES_PER_PAGE } = TIMELINE_CONFIG

// 今日の日付文字列を取得
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd')

export interface TimelineListProps {
  userId: string
  initialDate?: Date
  onDateChange?: (date: Date) => void
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
  /** 指定日付まで読み込んでからスクロールする関数を公開 */
  loadAndScrollToDateRef?: React.MutableRefObject<
    ((date: Date) => Promise<void>) | null
  >
}

export function TimelineList({
  userId,
  initialDate,
  onDateChange,
  scrollToDateRef,
  loadAndScrollToDateRef,
}: TimelineListProps) {
  // Zustandストアからアクティブ日付更新関数を取得
  const setActiveDates = useTimelineStore((s) => s.setActiveDates)
  // ストアAPIを取得（detectDateAtLine内で直接syncSourceを参照するため）
  const storeApi = useTimelineStoreApi()

  // DOM参照
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const latestEntryRef = useRef<HTMLDivElement>(null)

  // 状態
  const todayStr = useMemo(() => getTodayStr(), [])
  const prevDatesRef = useRef<string>('')
  const [displayedDateCount, setDisplayedDateCount] =
    useState<number>(DATES_PER_PAGE)

  // 日付Ref管理フック
  const { dateRefs, setDateRef } = useDateRefs()

  // タイムラインデータ取得
  const {
    entries,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
  } = useTimeline({
    userId,
    initialDate,
  })

  // 日付グループ化フック
  const {
    groupedEntries,
    allDates,
    dateIndexMap,
    displayedDates,
    activeDatesSet,
  } = useTimelineGrouping({
    entries,
    todayStr,
    displayedDateCount,
    initialDate,
  })

  // さらに古い日付があるか
  const hasMoreOlderDates = displayedDates.length < allDates.length || hasNextPage

  // 無限スクロールフック
  const { isLoadingMoreRef } = useInfiniteScroll({
    containerRef,
    topSentinelRef,
    bottomSentinelRef,
    dateRefs,
    displayedDates,
    allDates,
    hasMoreOlderDates,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    setDisplayedDateCount,
  })

  // 日付検出フック
  useDateDetection({
    containerRef,
    dateRefs,
    displayedDates,
    storeApi,
    initialDateStr: todayStr,
    onDateChange,
  })

  // 初期スクロールフック
  useInitialScroll({
    containerRef,
    dateRefs,
    displayedDates,
    allDates,
    dateIndexMap,
    displayedDateCount,
    initialDate,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    setDisplayedDateCount,
    isLoadingMoreRef,
    scrollToDateRef,
    loadAndScrollToDateRef,
  })

  // 記録がある日付をストアに通知（O(1)比較に最適化）
  useEffect(() => {
    if (entries.length > 0) {
      // 配列長と境界値のみで比較（O(n) join を回避）
      const first = allDates[0]
      const last = allDates[allDates.length - 1]
      const len = allDates.length
      const key = `${len}:${first}:${last}`

      if (key !== prevDatesRef.current) {
        prevDatesRef.current = key
        setActiveDates(activeDatesSet)
      }
    }
  }, [allDates, activeDatesSet, setActiveDates, entries.length])

  // ローディング状態
  if (isLoading && entries.length === 0) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="タイムラインを読み込み中"
        className="flex h-full flex-col items-center justify-center gap-4"
      >
        <div className="space-y-3 w-full max-w-md px-4">
          <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
          <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
          <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
        </div>
        <p className="text-muted-foreground">読み込み中...</p>
        <span className="sr-only">タイムラインを読み込んでいます</span>
      </div>
    )
  }

  // エラー状態
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-destructive">エラーが発生しました</div>
        <div className="text-sm text-muted-foreground">{error?.message}</div>
        <Button onClick={() => refetch()}>再試行</Button>
      </div>
    )
  }

  // 空状態
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>まだ投稿がありません</p>
          <p className="mt-2 text-sm">最初の記録を作成しましょう</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="timeline-list"
      className="relative h-full overflow-auto snap-y snap-proximity"
    >
      {/* 上端検出用センチネル */}
      <div ref={topSentinelRef} className="h-1" />

      {/* ローディングインジケータ */}
      {hasMoreOlderDates && (
        <div className="flex justify-center py-4 text-sm text-muted-foreground">
          上にスクロールで過去の記録を読み込み
        </div>
      )}

      {displayedDates.map((dateKey) => {
        const dateEntries = groupedEntries.get(dateKey) || []
        const hasEntries = dateEntries.length > 0
        const isToday = dateKey === todayStr

        // 当日以外で記録がない場合はスキップ（ほつれ使用日も記録なし扱い）
        if (!isToday && !hasEntries) {
          return null
        }

        return (
          <section
            key={dateKey}
            ref={setDateRef(dateKey)}
            data-date={dateKey}
            data-testid="date-section"
            aria-label={`${dateKey.replace(/-/g, '/')}の記録`}
            className="min-h-full border-b border-border snap-start"
          >
            <div className="space-y-2 px-4 py-2">
              <h2 data-testid="date-header" className="pt-3 text-center text-sm text-gray-400 dark:text-gray-500">
                {dateKey.replace(/-/g, '/')}
              </h2>
              {hasEntries ? (
                [...dateEntries]
                  .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                  .map((entry, index, arr) => {
                    // 最新日付セクションの最後のエントリかどうか
                    const isLatestEntry =
                      dateKey === displayedDates[displayedDates.length - 1] &&
                      index === arr.length - 1
                    // LCP対象: 最新日付の最初のエントリ
                    const isFirstEntry =
                      dateKey === displayedDates[displayedDates.length - 1] &&
                      index === 0
                    return (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        ref={isLatestEntry ? latestEntryRef : undefined}
                        isFirstEntry={isFirstEntry}
                      />
                    )
                  })
              ) : (
                // 当日で記録がない場合
                <div
                  ref={
                    dateKey === displayedDates[displayedDates.length - 1]
                      ? latestEntryRef
                      : undefined
                  }
                  className="flex h-32 items-center justify-center text-muted-foreground"
                >
                  <p className="text-sm">記録がありません</p>
                </div>
              )}
            </div>
          </section>
        )
      })}

      {/* 下端検出用センチネル（最新データの読み込み） */}
      {hasPreviousPage && (
        <>
          <div className="flex justify-center py-4 text-sm text-muted-foreground">
            下にスクロールで最新の記録を読み込み
          </div>
          <div ref={bottomSentinelRef} className="h-1" />
        </>
      )}
    </div>
  )
}
