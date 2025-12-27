'use client'

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { format, eachDayOfInterval, max, startOfDay, subDays } from 'date-fns'
import { useTimeline } from '../hooks/use-timeline'
import { useDateDetection } from '../hooks/use-date-detection'
import { useInfiniteScroll } from '../hooks/use-infinite-scroll'
import { EntryCard } from './entry-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimelineStore, useTimelineStoreApi } from '../stores/timeline-store'
import { TIMELINE_CONFIG } from '../constants'

const { DATES_PER_PAGE, PREFETCH_DAYS } = TIMELINE_CONFIG

// 今日の日付文字列を取得
const getTodayStr = () => format(new Date(), 'yyyy-MM-dd')

export interface TimelineListProps {
  userId: string
  initialDate?: Date
  onDateChange?: (date: Date) => void
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
  /** 指定日付まで読み込んでからスクロールする関数を公開 */
  loadAndScrollToDateRef?: React.MutableRefObject<((date: Date) => Promise<void>) | null>
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
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const todayStr = useMemo(() => getTodayStr(), [])
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const prevDatesRef = useRef<string>('')
  const initialScrollDone = useRef(false)
  // 最新エントリへの ref
  const latestEntryRef = useRef<HTMLDivElement>(null)
  // 表示日付数
  const [displayedDateCount, setDisplayedDateCount] = useState<number>(DATES_PER_PAGE)

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

  // isLoadingMore の参照（loadAndScrollToDate で使用）
  const isLoadingMore = isLoadingMoreRef

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

  // DOM要素の出現を待機するヘルパー関数
  // requestAnimationFrameを使用してReactのレンダリング完了を確実に待つ
  const waitForDomElement = useCallback(
    async (targetDateStr: string, maxWaitMs = 500): Promise<boolean> => {
      // 即座にチェック（既に存在すれば待機不要）
      if (dateRefs.current.has(targetDateStr)) {
        return true
      }

      const startTime = Date.now()
      while (Date.now() - startTime < maxWaitMs) {
        // requestAnimationFrameで1フレーム待機
        await new Promise((resolve) => requestAnimationFrame(resolve))

        if (dateRefs.current.has(targetDateStr)) {
          // レイアウト完了を確実にするためもう1フレーム待機
          await new Promise((resolve) => requestAnimationFrame(resolve))
          return true
        }
      }
      return false
    },
    []
  )

  // 指定日付まで読み込んでからスクロールする関数
  // スクロール後のずれを防ぐため、目標日付 + PREFETCH_DAYS日前までを先に読み込む

  const loadAndScrollToDate = useCallback(
    async (targetDate: Date) => {
      const targetDateStr = format(targetDate, 'yyyy-MM-dd')
      // 先読み目標: 目標日付の4日前
      const prefetchTargetStr = format(subDays(targetDate, PREFETCH_DAYS), 'yyyy-MM-dd')

      // ヘルパー: 過去方向に先読み目標まで読み込む
      const prefetchToPast = async (goalDateStr: string) => {
        if (isLoadingMore.current) return
        const oldestDate = allDates[0]
        if (!oldestDate || goalDateStr >= oldestDate || !hasNextPage) return

        isLoadingMore.current = true
        let attempts = 0
        const maxAttempts = 20

        while (attempts < maxAttempts && hasNextPage) {
          await fetchNextPage()
          attempts++
          setDisplayedDateCount((prev) => prev + DATES_PER_PAGE)

          // 目標に到達したかチェック（100msに短縮）
          const found = await waitForDomElement(goalDateStr, 100)
          if (found) break
        }
        isLoadingMore.current = false
      }

      // 既に読み込み済みの場合
      if (dateIndexMap.has(targetDateStr)) {
        // 4日前も既に読み込み済みか判定（これ以上過去がない場合も先読み不要）
        const prefetchRangeAlreadyLoaded =
          dateIndexMap.has(prefetchTargetStr) || !hasNextPage

        // 表示範囲に含まれていない場合は表示範囲を拡大
        if (!displayedDates.includes(targetDateStr)) {
          const targetIndex = dateIndexMap.get(targetDateStr)!
          const datesAfterTarget = allDates.length - targetIndex
          setDisplayedDateCount(Math.max(datesAfterTarget, displayedDateCount))
        }

        // 既にDOMに存在する場合は即座にスクロール
        // スムーズスクロール中のDOM変更によるスクロール位置ずれを防ぐため、prefetchはスキップ
        if (dateRefs.current.has(targetDateStr)) {
          scrollToDate(targetDate)
          return
        }

        // DOMに存在しない場合: 先読み範囲が未読み込みなら先読みしてからスクロール
        if (!prefetchRangeAlreadyLoaded) {
          await prefetchToPast(prefetchTargetStr)
        }

        // DOM要素の出現を待機してからスクロール
        await waitForDomElement(targetDateStr, 300)
        scrollToDate(targetDate)
        return
      }

      // 現在の範囲を確認
      const oldestDate = allDates[0]
      const newestDate = allDates[allDates.length - 1]

      // 過去方向の読み込みが必要（先読み目標まで読み込む）
      if (targetDateStr < oldestDate && hasNextPage) {
        // 先読み目標まで読み込み（targetDateStrより更に4日前まで）
        await prefetchToPast(prefetchTargetStr)

        // 最終確認してからスクロール
        await waitForDomElement(targetDateStr, 300)
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

          // DOM要素の出現を待機（最大200ms）
          const found = await waitForDomElement(targetDateStr, 200)
          if (found) {
            break
          }

          if (!hasPreviousPage) {
            break
          }
        }

        isLoadingMore.current = false

        // 最終確認してからスクロール
        await waitForDomElement(targetDateStr, 300)
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
      waitForDomElement,
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

        // 当日以外で記録がない場合はスキップ（ほつれ使用日も記録なし扱い）
        if (!isToday && !hasEntries) {
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
