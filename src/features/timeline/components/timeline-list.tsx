'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { useTimeline } from '../hooks/use-timeline'
import { EntryCard } from './entry-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// 1ページあたりの日付数
const DATES_PER_PAGE = 5

// 日付文字列の前後1日を計算（Date操作なし）
function getAdjacentDates(dateStr: string): { prev: string; next: string } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  date.setDate(day - 1)
  const prev = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  date.setDate(date.getDate() + 2) // -1した分を戻して+1
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return { prev, next }
}

// 今日の日付文字列を取得
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd')

export interface TimelineListProps {
  userId: string
  onDateChange?: (date: Date) => void
  onActiveDatesChange?: (dates: Set<string>) => void
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
}

export function TimelineList({
  userId,
  onDateChange,
  onActiveDatesChange,
  scrollToDateRef,
}: TimelineListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const todayStr = useMemo(() => getTodayStr(), [])
  const [visibleDate, setVisibleDate] = useState<string>(todayStr)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const prevDatesRef = useRef<string>('')
  const visibleDateRef = useRef<string>(todayStr)
  const [displayedDateCount, setDisplayedDateCount] = useState(DATES_PER_PAGE)
  const initialScrollDone = useRef(false)
  const isLoadingMore = useRef(false)

  const { entries, isLoading, isError, error, refetch, hasNextPage, fetchNextPage } = useTimeline({ userId })

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
  // 古い順にソートされているので、末尾からN件を取得
  const displayedDates = useMemo(() => {
    if (allDates.length <= displayedDateCount) {
      return allDates
    }
    // 末尾からdisplayedDateCount件を取得
    return allDates.slice(-displayedDateCount)
  }, [allDates, displayedDateCount])

  // さらに古い日付があるか
  const hasMoreOlderDates = displayedDates.length < allDates.length || hasNextPage

  // レンダリング対象の日付（visibleDate ± 1日）
  const renderDates = useMemo(() => {
    const { prev, next } = getAdjacentDates(visibleDate)
    return new Set([prev, visibleDate, next])
  }, [visibleDate])

  // 日付divへスクロール
  const scrollToDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const element = dateRefs.current.get(dateKey)
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' })
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

  // 記録がある日付を親に通知
  useEffect(() => {
    if (onActiveDatesChange && entries.length > 0) {
      const dateList = allDates.join(',')
      if (dateList !== prevDatesRef.current) {
        prevDatesRef.current = dateList
        onActiveDatesChange(activeDatesSet)
      }
    }
  }, [allDates, activeDatesSet, onActiveDatesChange, entries.length])

  // 初期表示時に最新日付（一番下）にスクロール
  useEffect(() => {
    if (!initialScrollDone.current && displayedDates.length > 0 && containerRef.current) {
      // 最新の日付（配列の最後）を取得
      const newestDate = displayedDates[displayedDates.length - 1]
      // DOMが更新されるのを待ってからスクロール
      requestAnimationFrame(() => {
        const element = dateRefs.current.get(newestDate)
        if (element) {
          element.scrollIntoView({ behavior: 'instant', block: 'start' })
          visibleDateRef.current = newestDate
          setVisibleDate(newestDate)
          initialScrollDone.current = true
        }
      })
    }
  }, [displayedDates])

  // Intersection Observerで可視日付を検出
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
        rootMargin: '-10% 0px -80% 0px',
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
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="space-y-3 w-full max-w-md px-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <p className="text-muted-foreground">読み込み中...</p>
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
        const shouldRender = renderDates.has(dateKey)

        return (
          <div
            key={dateKey}
            ref={setDateRef(dateKey)}
            data-date={dateKey}
            className="min-h-full border-b border-border"
          >
            {shouldRender ? (
              <div className="space-y-2 px-4 py-2">
                {dateEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              // プレースホルダー（レンダリングしない日付用）
              <div className="flex h-full items-center justify-center text-muted-foreground/50">
                {dateKey}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
