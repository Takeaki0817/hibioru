'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { format, eachDayOfInterval, max, startOfDay, subDays } from 'date-fns'
import { Spool } from 'lucide-react'
import { useTimeline } from '../hooks/use-timeline'
import { EntryCard } from './entry-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimelineStore } from '../stores/timeline-store'

// 1ページあたりの日付数
const DATES_PER_PAGE = 5

// 今日の日付文字列を取得
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd')

export interface TimelineListProps {
  userId: string
  initialDate?: Date
  /** ほつれを使用した日付セット（YYYY-MM-DD形式） */
  hotsureDates?: Set<string>
  onDateChange?: (date: Date) => void
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
  /** 指定日付まで読み込んでからスクロールする関数を公開 */
  loadAndScrollToDateRef?: React.MutableRefObject<((date: Date) => Promise<void>) | null>
  /** 指定日付からN日前までのデータを先読みする関数を公開 */
  prefetchDaysRef?: React.MutableRefObject<
    ((date: Date, days: number) => Promise<void>) | null
  >
}

export function TimelineList({
  userId,
  initialDate,
  hotsureDates,
  onDateChange,
  scrollToDateRef,
  loadAndScrollToDateRef,
  prefetchDaysRef,
}: TimelineListProps) {
  // Zustandストアからアクティブ日付更新関数を取得
  const setActiveDates = useTimelineStore((s) => s.setActiveDates)
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const todayStr = useMemo(() => getTodayStr(), [])
  const [_visibleDate, setVisibleDate] = useState<string>(todayStr)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const prevDatesRef = useRef<string>('')
  const visibleDateRef = useRef<string>(todayStr)
  const [displayedDateCount, setDisplayedDateCount] = useState(DATES_PER_PAGE)
  const initialScrollDone = useRef(false)
  const isLoadingMore = useRef(false)
  // 最新エントリへの ref
  const latestEntryRef = useRef<HTMLDivElement>(null)
  // onDateChange をrefで保持（Observer再作成を防止）
  const onDateChangeRef = useRef(onDateChange)

  // propsの最新値をrefに同期
  useEffect(() => {
    onDateChangeRef.current = onDateChange
  }, [onDateChange])

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

  // 全日付リスト（古い順にソート、今日までの空の日付も含む）
  const allDates = useMemo(() => {
    const entryDates = Array.from(groupedEntries.keys())
    if (entryDates.length === 0) {
      // エントリがない場合は今日のみ
      return [todayStr]
    }

    // エントリがある日付をDateオブジェクトに変換
    const entryDateObjects = entryDates.map((d) => new Date(d))
    const today = startOfDay(new Date())

    // 最新のエントリ日付と今日の日付のうち、より新しい方を終点とする
    const latestEntryDate = max(entryDateObjects)
    const endDate = latestEntryDate > today ? latestEntryDate : today

    // 最も古いエントリ日付から今日までの全日付を生成
    const oldestEntryDate = entryDateObjects.reduce((oldest, d) => (d < oldest ? d : oldest))
    const allDateObjects = eachDayOfInterval({ start: oldestEntryDate, end: endDate })

    return allDateObjects.map((d) => format(d, 'yyyy-MM-dd'))
  }, [groupedEntries, todayStr])

  // 日付 → インデックスの Map（O(1) 検索用）
  const dateIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    allDates.forEach((date, index) => map.set(date, index))
    return map
  }, [allDates])

  // 表示する日付（最新のN日分のみ）
  // initialDateが指定されている場合は、その日付から最新までを含める
  const displayedDates = useMemo(() => {
    // initialDateが指定されている場合、その日付から最新までを表示
    if (initialDate) {
      const initialDateStr = format(initialDate, 'yyyy-MM-dd')
      const initialIndex = dateIndexMap.get(initialDateStr)  // O(1) 参照
      if (initialIndex !== undefined) {
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
  }, [allDates, dateIndexMap, displayedDateCount, initialDate])

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

  // 指定日付まで読み込んでからスクロールする関数
  const loadAndScrollToDate = useCallback(
    async (targetDate: Date) => {
      const targetDateStr = format(targetDate, 'yyyy-MM-dd')

      // 既に読み込み済みの場合はスクロールのみ
      if (dateIndexMap.has(targetDateStr)) {
        // 表示範囲に含まれていない場合は表示範囲を拡大
        if (!displayedDates.includes(targetDateStr)) {
          const targetIndex = dateIndexMap.get(targetDateStr)!
          const datesAfterTarget = allDates.length - targetIndex
          setDisplayedDateCount(Math.max(datesAfterTarget, displayedDateCount))
        }
        // DOMが更新されるのを待ってからスクロール
        await new Promise((resolve) => requestAnimationFrame(resolve))
        scrollToDate(targetDate)
        return
      }

      // 現在の範囲を確認
      const oldestDate = allDates[0]
      const newestDate = allDates[allDates.length - 1]

      // 過去方向の読み込みが必要
      if (targetDateStr < oldestDate && hasNextPage) {
        // 読み込み中フラグを設定
        isLoadingMore.current = true

        // 指定日付に到達するまで読み込み
        let attempts = 0
        const maxAttempts = 20 // 無限ループ防止

        while (attempts < maxAttempts) {
          await fetchNextPage()
          attempts++

          // 表示範囲も拡大
          setDisplayedDateCount((prev) => prev + DATES_PER_PAGE)

          // 少し待ってから状態を確認
          await new Promise((resolve) => setTimeout(resolve, 50))

          // dateRefs が更新されているか確認
          if (dateRefs.current.has(targetDateStr)) {
            break
          }

          // これ以上読み込めない場合は終了
          if (!hasNextPage) {
            break
          }
        }

        isLoadingMore.current = false

        // DOMが更新されるのを待ってからスクロール
        await new Promise((resolve) => requestAnimationFrame(resolve))
        scrollToDate(targetDate)
      }
      // 未来方向の読み込みが必要（通常は発生しない）
      else if (targetDateStr > newestDate && hasPreviousPage) {
        isLoadingMore.current = true

        let attempts = 0
        const maxAttempts = 20

        while (attempts < maxAttempts) {
          await fetchPreviousPage()
          attempts++

          await new Promise((resolve) => setTimeout(resolve, 50))

          if (dateRefs.current.has(targetDateStr)) {
            break
          }

          if (!hasPreviousPage) {
            break
          }
        }

        isLoadingMore.current = false

        await new Promise((resolve) => requestAnimationFrame(resolve))
        scrollToDate(targetDate)
      }
    },
    [
      dateIndexMap,
      displayedDates,
      allDates,
      displayedDateCount,
      hasNextPage,
      hasPreviousPage,
      fetchNextPage,
      fetchPreviousPage,
      scrollToDate,
    ]
  )

  // 親コンポーネントにloadAndScrollToDate関数を公開
  useEffect(() => {
    if (loadAndScrollToDateRef) {
      loadAndScrollToDateRef.current = loadAndScrollToDate
    }
    return () => {
      if (loadAndScrollToDateRef) {
        loadAndScrollToDateRef.current = null
      }
    }
  }, [loadAndScrollToDate, loadAndScrollToDateRef])

  // 指定日付からN日前までのデータを先読みする関数（スクロールなし）
  const prefetchDays = useCallback(
    async (targetDate: Date, days: number) => {
      const prefetchTargetStr = format(subDays(targetDate, days), 'yyyy-MM-dd')

      // 既に読み込み済みならスキップ
      if (dateIndexMap.has(prefetchTargetStr)) return

      // 読み込み中なら新しい読み込みをスキップ
      if (isLoadingMore.current) return

      // 現在の最古日付より過去なら読み込み
      const oldestDate = allDates[0]
      if (prefetchTargetStr < oldestDate && hasNextPage) {
        isLoadingMore.current = true

        let attempts = 0
        const maxAttempts = 20

        while (attempts < maxAttempts) {
          await fetchNextPage()
          attempts++

          // 表示範囲も拡大
          setDisplayedDateCount((prev) => prev + DATES_PER_PAGE)

          // 少し待ってから状態を確認
          await new Promise((resolve) => setTimeout(resolve, 50))

          // 目標日付に到達したかチェック
          if (dateRefs.current.has(prefetchTargetStr)) {
            break
          }

          // これ以上読み込めない場合は終了
          if (!hasNextPage) {
            break
          }
        }

        isLoadingMore.current = false
      }
    },
    [dateIndexMap, allDates, hasNextPage, fetchNextPage]
  )

  // 親コンポーネントにprefetchDays関数を公開
  useEffect(() => {
    if (prefetchDaysRef) {
      prefetchDaysRef.current = prefetchDays
    }
    return () => {
      if (prefetchDaysRef) {
        prefetchDaysRef.current = null
      }
    }
  }, [prefetchDays, prefetchDaysRef])

  // 記録がある日付のSet（メモ化）
  const activeDatesSet = useMemo(() => new Set(allDates), [allDates])

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

  // 初期表示時にスクロール
  // - initialDateが指定されている場合: その日付にスクロール
  // - 指定されていない場合: 最新エントリが見える位置にスクロール
  // 注意: 日付の検知は detectDateAtLine に任せる（visibleDateRef は設定しない）
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
            initialScrollDone.current = true
          }
        } else {
          // 最新の日付セクションにスクロール（検出ラインに入るようにblock: 'start'）
          const latestDate = displayedDates[displayedDates.length - 1]
          if (latestDate) {
            const element = dateRefs.current.get(latestDate)
            if (element) {
              element.scrollIntoView({ behavior: 'instant', block: 'start' })
            }
          }
          initialScrollDone.current = true
        }
      })
    }
  }, [displayedDates, initialDate])

  // onDateChangeRef を最新に保つ
  useEffect(() => {
    onDateChangeRef.current = onDateChange
  }, [onDateChange])

  // スクロール時に検知ラインにある日付を検出
  // 検出ライン: ヘッダー下辺から12px下の位置
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const detectionOffset = 12  // ヘッダー下辺から12px下
    let rafId: number | null = null

    const detectDateAtLine = () => {
      const containerRect = container.getBoundingClientRect()
      const detectionLineY = containerRect.top + detectionOffset

      // 全ての日付セクションをチェック
      for (const [dateKey, element] of dateRefs.current) {
        const rect = element.getBoundingClientRect()
        if (rect.top <= detectionLineY && rect.bottom >= detectionLineY) {
          if (dateKey !== visibleDateRef.current) {
            visibleDateRef.current = dateKey
            setVisibleDate(dateKey)
            onDateChangeRef.current?.(new Date(dateKey))
          }
          break
        }
      }
    }

    const handleScroll = () => {
      // requestAnimationFrameでスロットル
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        detectDateAtLine()
        rafId = null
      })
    }

    // 初期読み込み時に検出
    requestAnimationFrame(detectDateAtLine)

    // スクロール時に検出
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [displayedDates])

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
    <div ref={containerRef} className="relative h-full overflow-auto snap-y snap-proximity">
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
        const hasHotsure = hotsureDates?.has(dateKey)

        // 当日以外で記録もほつれもない場合はスキップ
        if (!isToday && !hasEntries && !hasHotsure) {
          return null
        }

        return (
          <section
            key={dateKey}
            ref={setDateRef(dateKey)}
            data-date={dateKey}
            aria-label={`${dateKey.replace(/-/g, '/')}の記録`}
            className="min-h-full border-b border-border snap-start"
          >
            <div className="space-y-2 px-4 py-2">
              <h2 className="pt-3 text-center text-sm text-gray-400 dark:text-gray-500">
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
                    return (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        ref={isLatestEntry ? latestEntryRef : undefined}
                      />
                    )
                  })
              ) : hasHotsure ? (
                // ほつれ直し表示
                <div
                  ref={
                    dateKey === displayedDates[displayedDates.length - 1]
                      ? latestEntryRef
                      : undefined
                  }
                  className="flex h-32 items-center justify-center gap-1 text-muted-foreground"
                >
                  <Spool className="h-5 w-5" />
                  <span className="text-sm">ほつれ直し</span>
                </div>
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
