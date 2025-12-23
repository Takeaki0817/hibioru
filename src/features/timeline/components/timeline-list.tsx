'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { AnimatePresence } from 'framer-motion'
import { useTimeline } from '../hooks/use-timeline'
import { EntryCard } from './entry-card'
import { PendingEntryCard } from './pending-entry-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimelineStore } from '../stores/timeline-store'
import { usePendingEntryStore } from '@/stores/pending-entry-store'

// 1ページあたりの日付数
const DATES_PER_PAGE = 5

// 今日の日付文字列を取得
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd')

export interface TimelineListProps {
  userId: string
  initialDate?: Date
  onDateChange?: (date: Date) => void
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
}

export function TimelineList({
  userId,
  initialDate,
  onDateChange,
  scrollToDateRef,
}: TimelineListProps) {
  // Zustandストアからアクティブ日付更新関数を取得
  const setActiveDates = useTimelineStore((s) => s.setActiveDates)
  // ペンディング投稿の取得
  const pendingEntry = usePendingEntryStore((s) => s.pendingEntry)
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const todayStr = useMemo(() => getTodayStr(), [])
  const [_visibleDate, setVisibleDate] = useState<string>(todayStr)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const prevDatesRef = useRef<string>('')
  const visibleDateRef = useRef<string>(todayStr)
  const [displayedDateCount, setDisplayedDateCount] = useState(DATES_PER_PAGE)
  const initialScrollDone = useRef(false)
  const isLoadingMore = useRef(false)
  // 最新エントリへの ref
  const latestEntryRef = useRef<HTMLDivElement>(null)

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

  // 日付ごとにエントリをグループ化
  const groupedEntries = useMemo(() => {
    const grouped = new Map<string, typeof entries>()
    for (const entry of entries) {
      const dateKey = entry.date
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(entry)
    }
    return grouped
  }, [entries])

  // 全日付リスト（古い順にソート）
  const allDates = useMemo(() => {
    return Array.from(groupedEntries.keys()).sort((a, b) => a.localeCompare(b))
  }, [groupedEntries])

  // 表示する日付（最新のN日分のみ）
  // initialDateが指定されている場合は、その日付から最新までを含める
  const displayedDates = useMemo(() => {
    // initialDateが指定されている場合、その日付から最新までを表示
    if (initialDate) {
      const initialDateStr = format(initialDate, 'yyyy-MM-dd')
      const initialIndex = allDates.indexOf(initialDateStr)
      if (initialIndex !== -1) {
        // initialDateから最新までの日付数を計算
        const datesAfterInitial = allDates.length - initialIndex
        const countNeeded = Math.max(datesAfterInitial, displayedDateCount)
        return allDates.slice(-countNeeded)
      }
    }

    // デフォルト：末尾からdisplayedDateCount件
    if (allDates.length <= displayedDateCount) {
      return allDates
    }
    return allDates.slice(-displayedDateCount)
  }, [allDates, displayedDateCount, initialDate])

  // さらに古い日付があるか
  const hasMoreOlderDates = displayedDates.length < allDates.length || hasNextPage

  // 日付divへスクロール
  const scrollToDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const element = dateRefs.current.get(dateKey)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // 親コンポーネントにscrollToDate関数を公開
  useEffect(() => {
    if (scrollToDateRef) {
      scrollToDateRef.current = scrollToDate
    }
    return () => {
      if (scrollToDateRef) {
        scrollToDateRef.current = null
      }
    }
  }, [scrollToDate, scrollToDateRef])

  // 記録がある日付のSet（メモ化）
  const activeDatesSet = useMemo(() => new Set(allDates), [allDates])

  // 記録がある日付をストアに通知
  useEffect(() => {
    if (entries.length > 0) {
      const dateList = allDates.join(',')
      if (dateList !== prevDatesRef.current) {
        prevDatesRef.current = dateList
        setActiveDates(activeDatesSet)
      }
    }
  }, [allDates, activeDatesSet, setActiveDates, entries.length])

  // 初期表示時にスクロール
  // - initialDateが指定されている場合: その日付にスクロール
  // - 指定されていない場合: 最新エントリが見える位置にスクロール
  useEffect(() => {
    if (!initialScrollDone.current && displayedDates.length > 0 && containerRef.current) {
      // DOMが更新されるのを待ってからスクロール
      requestAnimationFrame(() => {
        if (initialDate) {
          // initialDateが指定されている場合はその日付セクションにスクロール
          const targetDate = format(initialDate, 'yyyy-MM-dd')
          const element = dateRefs.current.get(targetDate)
          if (element) {
            element.scrollIntoView({ behavior: 'instant', block: 'start' })
            visibleDateRef.current = targetDate
            setVisibleDate(targetDate)
            initialScrollDone.current = true
          }
        } else {
          // 最新エントリが見える位置にスクロール
          if (latestEntryRef.current) {
            latestEntryRef.current.scrollIntoView({ behavior: 'instant', block: 'center' })
            // 最新日付を設定
            const latestDate = displayedDates[displayedDates.length - 1]
            visibleDateRef.current = latestDate
            setVisibleDate(latestDate)
            initialScrollDone.current = true
          }
        }
      })
    }
  }, [displayedDates, initialDate])

  // Intersection Observerで可視日付を検出
  // 検出ライン: コンテナ上端から100pxの位置（1pxの高さ）
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 検出ラインを上端から100pxの位置に1pxの高さで作成
    const containerHeight = container.clientHeight
    const bottomMargin = -(containerHeight - 101)

    observerRef.current = new IntersectionObserver(
      (observerEntries) => {
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            const dateStr = entry.target.getAttribute('data-date')
            // refで比較してstateを更新（依存配列にvisibleDateを含めない）
            if (dateStr && dateStr !== visibleDateRef.current) {
              visibleDateRef.current = dateStr
              setVisibleDate(dateStr)
              onDateChange?.(new Date(dateStr))
            }
          }
        }
      },
      {
        root: container,
        rootMargin: `-100px 0px ${bottomMargin}px 0px`,
        threshold: 0,
      }
    )

    // 日付divを監視
    dateRefs.current.forEach((element) => {
      observerRef.current?.observe(element)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [displayedDates, onDateChange])

  // 上端検出: 古い日付を追加読み込み
  useEffect(() => {
    const container = containerRef.current
    const sentinel = topSentinelRef.current
    if (!container || !sentinel) return

    topObserverRef.current = new IntersectionObserver(
      async (observerEntries) => {
        const entry = observerEntries[0]
        if (entry.isIntersecting && hasMoreOlderDates && !isLoadingMore.current) {
          isLoadingMore.current = true

          // スクロール位置を保持するため、現在の最上部要素を記録
          const topElement = displayedDates[0]
          const topElementRef = dateRefs.current.get(topElement)

          // まず表示日付数を増やす
          if (displayedDates.length < allDates.length) {
            setDisplayedDateCount((prev) => prev + DATES_PER_PAGE)
          } else if (hasNextPage) {
            // サーバーから追加読み込み
            await fetchNextPage()
            setDisplayedDateCount((prev) => prev + DATES_PER_PAGE)
          }

          // スクロール位置を維持（新しいコンテンツが上に追加された分だけスクロール）
          requestAnimationFrame(() => {
            if (topElementRef) {
              // 追加前の最上部要素の新しい位置にスクロール
              container.scrollTop = topElementRef.offsetTop
            }
            isLoadingMore.current = false
          })
        }
      },
      {
        root: container,
        rootMargin: '100px 0px 0px 0px',
        threshold: 0,
      }
    )

    topObserverRef.current.observe(sentinel)

    return () => {
      topObserverRef.current?.disconnect()
    }
  }, [displayedDates, allDates, hasMoreOlderDates, hasNextPage, fetchNextPage])

  // 下端検出: 最新データを追加読み込み
  useEffect(() => {
    const container = containerRef.current
    const sentinel = bottomSentinelRef.current
    if (!container || !sentinel || !hasPreviousPage) return

    bottomObserverRef.current = new IntersectionObserver(
      async (observerEntries) => {
        const entry = observerEntries[0]
        if (entry.isIntersecting && !isLoadingMore.current) {
          isLoadingMore.current = true
          await fetchPreviousPage()
          isLoadingMore.current = false
        }
      },
      {
        root: container,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0,
      }
    )

    bottomObserverRef.current.observe(sentinel)

    return () => {
      bottomObserverRef.current?.disconnect()
    }
  }, [hasPreviousPage, fetchPreviousPage])

  // 日付divのref設定
  const setDateRef = useCallback(
    (dateKey: string) => (element: HTMLDivElement | null) => {
      if (element) {
        dateRefs.current.set(dateKey, element)
      } else {
        dateRefs.current.delete(dateKey)
      }
    },
    []
  )

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

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-destructive">エラーが発生しました</div>
        <div className="text-sm text-muted-foreground">{error?.message}</div>
        <Button onClick={() => refetch()}>
          再試行
        </Button>
      </div>
    )
  }

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
    <div ref={containerRef} className="h-full overflow-auto">
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

        return (
          <section
            key={dateKey}
            ref={setDateRef(dateKey)}
            data-date={dateKey}
            aria-label={`${dateKey.replace(/-/g, '/')}の記録`}
            className="min-h-full border-b border-border"
          >
            <div className="space-y-2 px-4 py-2">
              <h2 className="pt-3 text-center text-sm text-gray-400 dark:text-gray-500">
                {dateKey.replace(/-/g, '/')}
              </h2>
              {[...dateEntries]
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                .map((entry, index, arr) => {
                  // 最新日付セクションの最後のエントリかどうか
                  const isLatestEntry =
                    dateKey === displayedDates[displayedDates.length - 1] &&
                    index === arr.length - 1
                  return (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      ref={isLatestEntry ? latestEntryRef : undefined}
                    />
                  )
                })}
            </div>
          </section>
        )
      })}

      {/* ペンディング投稿表示 */}
      <AnimatePresence>
        {pendingEntry && pendingEntry.status !== 'success' && (
          <PendingEntryCard entry={pendingEntry} />
        )}
      </AnimatePresence>

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
