'use client'

import { useRef, useEffect, useCallback } from 'react'
import { TIMELINE_CONFIG } from '../constants'

const { DATES_PER_PAGE, TOP_MARGIN_PX, BOTTOM_MARGIN_PX } = TIMELINE_CONFIG

interface UseInfiniteScrollOptions {
  /** コンテナ要素への参照 */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 上端センチネル要素への参照 */
  topSentinelRef: React.RefObject<HTMLDivElement | null>
  /** 下端センチネル要素への参照 */
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>
  /** 日付要素のMapへの参照 */
  dateRefs: React.RefObject<Map<string, HTMLDivElement>>
  /** 表示中の日付リスト */
  displayedDates: string[]
  /** 全日付リスト */
  allDates: string[]
  /** 古い日付がまだあるか */
  hasMoreOlderDates: boolean
  /** サーバーに次のページがあるか */
  hasNextPage: boolean
  /** サーバーに前のページがあるか */
  hasPreviousPage: boolean
  /** 次のページを取得 */
  fetchNextPage: () => Promise<unknown>
  /** 前のページを取得 */
  fetchPreviousPage: () => Promise<unknown>
  /** 表示日付数を設定（親から渡される） */
  setDisplayedDateCount: React.Dispatch<React.SetStateAction<number>>
}

interface UseInfiniteScrollResult {
  /** 読み込み中フラグへの参照 */
  isLoadingMoreRef: React.RefObject<boolean>
}

/**
 * 無限スクロールを管理するカスタムフック
 * IntersectionObserverを使用して上端・下端の検出を行う
 */
export function useInfiniteScroll({
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
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const isLoadingMoreRef = useRef(false)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)

  // 上端検出コールバック: 古い日付を追加読み込み
  const onTopIntersect = useCallback(
    async (observerEntries: IntersectionObserverEntry[]) => {
      const entry = observerEntries[0]
      if (!entry.isIntersecting || !hasMoreOlderDates || isLoadingMoreRef.current) return

      isLoadingMoreRef.current = true
      const container = containerRef.current

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
        if (topElementRef && container) {
          // 追加前の最上部要素の新しい位置にスクロール
          container.scrollTop = topElementRef.offsetTop
        }
        isLoadingMoreRef.current = false
      })
    },
    [containerRef, dateRefs, displayedDates, allDates, hasMoreOlderDates, hasNextPage, fetchNextPage]
  )

  // 下端検出コールバック: 最新データを追加読み込み
  const onBottomIntersect = useCallback(
    async (observerEntries: IntersectionObserverEntry[]) => {
      const entry = observerEntries[0]
      if (!entry.isIntersecting || isLoadingMoreRef.current) return

      isLoadingMoreRef.current = true
      await fetchPreviousPage()
      isLoadingMoreRef.current = false
    },
    [fetchPreviousPage]
  )

  // 上端検出: IntersectionObserver設定
  useEffect(() => {
    const container = containerRef.current
    const sentinel = topSentinelRef.current
    if (!container || !sentinel) return

    topObserverRef.current = new IntersectionObserver(onTopIntersect, {
      root: container,
      rootMargin: `${TOP_MARGIN_PX}px 0px 0px 0px`,
      threshold: 0,
    })

    topObserverRef.current.observe(sentinel)

    return () => {
      topObserverRef.current?.disconnect()
    }
  }, [containerRef, topSentinelRef, onTopIntersect])

  // 下端検出: IntersectionObserver設定
  useEffect(() => {
    const container = containerRef.current
    const sentinel = bottomSentinelRef.current
    if (!container || !sentinel || !hasPreviousPage) return

    bottomObserverRef.current = new IntersectionObserver(onBottomIntersect, {
      root: container,
      rootMargin: `0px 0px ${BOTTOM_MARGIN_PX}px 0px`,
      threshold: 0,
    })

    bottomObserverRef.current.observe(sentinel)

    return () => {
      bottomObserverRef.current?.disconnect()
    }
  }, [containerRef, bottomSentinelRef, hasPreviousPage, onBottomIntersect])

  return {
    isLoadingMoreRef,
  }
}
