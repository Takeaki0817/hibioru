'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimelineEntry } from '@/lib/timeline/types'

export interface ScrollSyncState {
  currentDate: Date
  isSnapping: boolean
}

export interface UseScrollSyncOptions {
  containerRef: React.RefObject<HTMLElement | null>
  entries: TimelineEntry[]
  onDateChange?: (date: Date) => void
}

export interface UseScrollSyncReturn {
  state: ScrollSyncState
  scrollToDate: (date: Date) => void
  handleScroll: () => void
  getDateAtPosition: (scrollTop: number) => Date
}

export function useScrollSync(
  options: UseScrollSyncOptions
): UseScrollSyncReturn {
  const { containerRef, entries, onDateChange } = options
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [isSnapping, setIsSnapping] = useState(false)
  const rafIdRef = useRef<number | null>(null)

  // スクロール位置から日付を算出
  const getDateAtPosition = useCallback(
    // scrollTopパラメータは将来的な位置計算の拡張用に維持
    (scrollTop: number): Date => {
      // 現在は引数を直接使用せずDOM位置から算出
      void scrollTop
      const container = containerRef.current
      if (!container || entries.length === 0) {
        return new Date()
      }

      // 各エントリ要素の位置を確認して、現在のスクロール位置に対応するものを特定
      const entryElements = container.querySelectorAll('[data-date]')
      const containerRect = container.getBoundingClientRect()

      // ビューポート上部に最も近い要素を探す
      let closestElement: Element | null = null
      let closestDistance = Infinity

      for (const element of entryElements) {
        const rect = element.getBoundingClientRect()
        // コンテナの上端からの相対的な距離を計算
        const distance = Math.abs(rect.top - containerRect.top)

        if (distance < closestDistance && rect.top >= containerRect.top - rect.height) {
          closestDistance = distance
          closestElement = element
        }
      }

      if (closestElement) {
        const dateStr = closestElement.getAttribute('data-date')
        if (dateStr) {
          return new Date(dateStr)
        }
      }

      // フォールバック: 最初のエントリの日付
      return new Date(entries[0].date)
    },
    [entries, containerRef]
  )

  // スクロールイベントハンドラ（デバウンス付き）
  const handleScroll = useCallback(() => {
    if (isSnapping) return

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop
      const newDate = getDateAtPosition(scrollTop)

      if (newDate.getTime() !== currentDate.getTime()) {
        setCurrentDate(newDate)
        onDateChange?.(newDate)
      }
    })
  }, [containerRef, getDateAtPosition, currentDate, isSnapping, onDateChange])

  // 指定日付へスクロール
  const scrollToDate = useCallback(
    (targetDate: Date) => {
      if (!containerRef.current) return

      setIsSnapping(true)

      // 指定日付の要素を検索してスクロール
      const container = containerRef.current
      const dateStr = targetDate.toISOString().split('T')[0]
      const targetElement = container.querySelector(`[data-date="${dateStr}"]`)

      if (targetElement) {
        // 対象要素が見つかった場合、その位置までスクロール
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      } else {
        // 対象要素が見つからない場合、トップへスクロール
        container.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }

      // スナップ状態を解除
      setTimeout(() => {
        setIsSnapping(false)
      }, 500)
    },
    [containerRef]
  )

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return {
    state: {
      currentDate,
      isSnapping,
    },
    scrollToDate,
    handleScroll,
    getDateAtPosition,
  }
}
