'use client'

import { useRef, useEffect, useCallback } from 'react'
import { subDays } from 'date-fns'
import { getJSTDateString } from '@/lib/date-utils'
import { TIMELINE_CONFIG } from '../constants'

const { DATES_PER_PAGE, PREFETCH_DAYS, WAIT_FOR_DOM_MS, WAIT_FOR_LAYOUT_MS } =
  TIMELINE_CONFIG

interface UseInitialScrollOptions {
  /** コンテナ要素への参照 */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 日付要素のMapへの参照 */
  dateRefs: React.RefObject<Map<string, HTMLDivElement>>
  /** 表示中の日付リスト */
  displayedDates: string[]
  /** 全日付リスト */
  allDates: string[]
  /** 日付 → インデックスのMap */
  dateIndexMap: Map<string, number>
  /** 表示日付数 */
  displayedDateCount: number
  /** 初期表示日付 */
  initialDate?: Date
  /** サーバーに次のページがあるか */
  hasNextPage: boolean
  /** サーバーに前のページがあるか */
  hasPreviousPage: boolean
  /** 次のページを取得 */
  fetchNextPage: () => Promise<unknown>
  /** 前のページを取得 */
  fetchPreviousPage: () => Promise<unknown>
  /** 表示日付数を設定 */
  setDisplayedDateCount: React.Dispatch<React.SetStateAction<number>>
  /** 読み込み中フラグへの参照 */
  isLoadingMoreRef: React.RefObject<boolean>
  /** 親コンポーネントにscrollToDate関数を公開するref */
  scrollToDateRef?: React.MutableRefObject<((date: Date) => void) | null>
  /** 親コンポーネントにloadAndScrollToDate関数を公開するref */
  loadAndScrollToDateRef?: React.MutableRefObject<
    ((date: Date) => Promise<void>) | null
  >
}

interface UseInitialScrollResult {
  /** 初期スクロール完了フラグへの参照 */
  initialScrollDoneRef: React.RefObject<boolean>
  /** 日付へスクロールする関数 */
  scrollToDate: (date: Date) => void
}

/**
 * 初期スクロールと日付ジャンプを管理するカスタムフック
 *
 * 責務:
 * - 初期表示時のスクロール位置設定
 * - 指定日付へのスムーズスクロール
 * - 未読み込み日付の先読みとスクロール
 */
export function useInitialScroll({
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
}: UseInitialScrollOptions): UseInitialScrollResult {
  const initialScrollDoneRef = useRef(false)

  // 日付divへスクロール
  const scrollToDate = useCallback((date: Date) => {
    const dateKey = getJSTDateString(date)
    const element = dateRefs.current.get(dateKey)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [dateRefs])

  // DOM要素の出現を待機するヘルパー関数
  // requestAnimationFrameを使用してReactのレンダリング完了を確実に待つ
  const waitForDomElement = useCallback(
    async (targetDateStr: string, maxWaitMs: number = WAIT_FOR_DOM_MS): Promise<boolean> => {
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
    [dateRefs]
  )

  // 指定日付まで読み込んでからスクロールする関数
  // スクロール後のずれを防ぐため、目標日付 + PREFETCH_DAYS日前までを先に読み込む
  const loadAndScrollToDate = useCallback(
    async (targetDate: Date) => {
      const targetDateStr = getJSTDateString(targetDate)
      // 先読み目標: 目標日付の4日前
      const prefetchTargetStr = getJSTDateString(
        subDays(targetDate, PREFETCH_DAYS)
      )

      // ヘルパー: 過去方向に先読み目標まで読み込む
      const prefetchToPast = async (goalDateStr: string) => {
        if (isLoadingMoreRef.current) return
        const oldestDate = allDates[0]
        if (!oldestDate || goalDateStr >= oldestDate || !hasNextPage) return

        isLoadingMoreRef.current = true
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
        isLoadingMoreRef.current = false
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
        await waitForDomElement(targetDateStr, WAIT_FOR_LAYOUT_MS)
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
        await waitForDomElement(targetDateStr, WAIT_FOR_LAYOUT_MS)
        scrollToDate(targetDate)
      }
      // 未来方向の読み込みが必要（通常は発生しない）
      else if (targetDateStr > newestDate && hasPreviousPage) {
        isLoadingMoreRef.current = true

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

        isLoadingMoreRef.current = false

        // 最終確認してからスクロール
        await waitForDomElement(targetDateStr, WAIT_FOR_LAYOUT_MS)
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
      isLoadingMoreRef,
      setDisplayedDateCount,
      dateRefs,
    ]
  )

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

  // 初期表示時にスクロール
  // - initialDateが指定されている場合: その日付にスクロール
  // - 指定されていない場合: 最新エントリが見える位置にスクロール
  // 注意: 日付の検知は detectDateAtLine に任せる
  useEffect(() => {
    if (
      !initialScrollDoneRef.current &&
      displayedDates.length > 0 &&
      containerRef.current
    ) {
      // DOMが更新されるのを待ってからスクロール
      requestAnimationFrame(() => {
        if (initialDate) {
          // initialDateが指定されている場合はその日付セクションにスクロール
          const targetDate = getJSTDateString(initialDate)
          const element = dateRefs.current.get(targetDate)
          if (element) {
            element.scrollIntoView({ behavior: 'instant', block: 'start' })
            initialScrollDoneRef.current = true
          }
        } else {
          // 一番下（最新の投稿が見える位置）にスクロール
          const latestDate = displayedDates[displayedDates.length - 1]
          if (latestDate) {
            const element = dateRefs.current.get(latestDate)
            if (element) {
              element.scrollIntoView({ behavior: 'instant', block: 'end' })
            }
          }
          initialScrollDoneRef.current = true
        }
      })
    }
  }, [displayedDates, initialDate, containerRef, dateRefs])

  return {
    initialScrollDoneRef,
    scrollToDate,
  }
}
