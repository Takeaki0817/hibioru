'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { useTimeline } from '../hooks/use-timeline'
import { EntryCard } from './entry-card'

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
  const [visibleDate, setVisibleDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const prevDatesRef = useRef<string>('')

  const { entries, isLoading, isError, error, refetch } = useTimeline({ userId })

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

  // 日付リスト（ソート済み）
  const sortedDates = useMemo(() => {
    return Array.from(groupedEntries.keys()).sort((a, b) => b.localeCompare(a))
  }, [groupedEntries])

  // レンダリング対象の日付（visibleDate ± 1日）
  const renderDates = useMemo(() => {
    const visibleDateObj = new Date(visibleDate)
    const prev = format(subDays(visibleDateObj, 1), 'yyyy-MM-dd')
    const next = format(addDays(visibleDateObj, 1), 'yyyy-MM-dd')
    return new Set([prev, visibleDate, next])
  }, [visibleDate])

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

  // 記録がある日付を親に通知
  useEffect(() => {
    if (onActiveDatesChange && entries.length > 0) {
      const dateList = sortedDates.join(',')
      if (dateList !== prevDatesRef.current) {
        prevDatesRef.current = dateList
        onActiveDatesChange(new Set(sortedDates))
      }
    }
  }, [sortedDates, onActiveDatesChange, entries.length])

  // Intersection Observerで可視日付を検出
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    observerRef.current = new IntersectionObserver(
      (observerEntries) => {
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            const dateStr = entry.target.getAttribute('data-date')
            if (dateStr && dateStr !== visibleDate) {
              setVisibleDate(dateStr)
              onDateChange?.(new Date(dateStr))
            }
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -80% 0px', // 上部10%の領域で検出
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
  }, [sortedDates, visibleDate, onDateChange])

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
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-red-600">エラーが発生しました</div>
        <div className="text-sm text-gray-500">{error?.message}</div>
        <button
          onClick={() => refetch()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-500">
          <p>まだ投稿がありません</p>
          <p className="mt-2 text-sm">最初の記録を作成しましょう</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      {sortedDates.map((dateKey) => {
        const dateEntries = groupedEntries.get(dateKey) || []
        const shouldRender = renderDates.has(dateKey)

        return (
          <div
            key={dateKey}
            ref={setDateRef(dateKey)}
            data-date={dateKey}
            className="min-h-[100lvh] border-b border-gray-100"
          >
            {shouldRender ? (
              <div className="space-y-2 px-4 py-2">
                {dateEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              // プレースホルダー（レンダリングしない日付用）
              <div className="flex h-[100lvh] items-center justify-center text-gray-300">
                {dateKey}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
