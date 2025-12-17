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
    (_scrollTop: number): Date => {
      // TODO: 実際のDOM要素の位置から日付を計算
      // 簡易実装: 最初のエントリの日付を返す
      if (entries.length > 0) {
        return new Date(entries[0].date)
      }
      return new Date()
    },
    [entries]
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
    (_date: Date) => {
      if (!containerRef.current) return

      setIsSnapping(true)

      // TODO: 日付からスクロール位置を計算してスムーズスクロール
      // 簡易実装
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      })

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
