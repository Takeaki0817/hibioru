'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimelineEntry } from '../types'

export interface ScrollSyncState {
  currentDate: Date
  isSnapping: boolean
}

export interface UseScrollSyncOptions {
  containerRef: React.RefObject<HTMLElement | null>
  entries: TimelineEntry[]
  onDateChange?: (date: Date) => void
  // スナップスクロールを有効にするかどうか（デフォルト: false）
  enableSnapScroll?: boolean
}

export interface UseScrollSyncReturn {
  state: ScrollSyncState
  scrollToDate: (date: Date) => void
  handleScroll: () => void
  getDateAtPosition: (scrollTop: number) => Date
}

// スナップアニメーションの持続時間（ミリ秒）
const SNAP_ANIMATION_DURATION = 500

export function useScrollSync(
  options: UseScrollSyncOptions
): UseScrollSyncReturn {
  const { containerRef, entries, onDateChange, enableSnapScroll = false } = options
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [isSnapping, setIsSnapping] = useState(false)
  const rafIdRef = useRef<number | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const previousDateRef = useRef<string | null>(null)

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
      }, SNAP_ANIMATION_DURATION)
    },
    [containerRef]
  )

  // Intersection Observerを使用した日付境界検出
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 既存のobserverをクリーンアップ
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // IntersectionObserverの設定
    // コンテナのビューポート内の要素を監視
    const observerOptions: IntersectionObserverInit = {
      root: container,
      // コンテナ上部20%の領域で検出
      rootMargin: '-80% 0px 0px 0px',
      threshold: 0,
    }

    // スナップスクロールのための内部関数
    const performSnapScroll = (targetDate: Date) => {
      if (!containerRef.current) return

      setIsSnapping(true)

      const dateStr = targetDate.toISOString().split('T')[0]
      const targetElement = containerRef.current.querySelector(`[data-date="${dateStr}"]`)

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }

      setTimeout(() => {
        setIsSnapping(false)
      }, SNAP_ANIMATION_DURATION)
    }

    const handleIntersection = (observerEntries: IntersectionObserverEntry[]) => {
      // スナップ中は検出をスキップ
      // isSnappingをrefから直接読まないため、クロージャの問題を回避

      // 可視状態になった要素を取得
      const visibleEntries = observerEntries.filter(entry => entry.isIntersecting)
      if (visibleEntries.length === 0) return

      // 最も上にある要素の日付を取得
      const topEntry = visibleEntries.reduce((top, current) => {
        const topRect = top.boundingClientRect
        const currentRect = current.boundingClientRect
        return currentRect.top < topRect.top ? current : top
      })

      const dateStr = topEntry.target.getAttribute('data-date')
      if (dateStr && dateStr !== previousDateRef.current) {
        previousDateRef.current = dateStr
        const newDate = new Date(dateStr)
        setCurrentDate(newDate)
        onDateChange?.(newDate)

        // スナップスクロールが有効な場合、日付境界でスナップ
        if (enableSnapScroll) {
          performSnapScroll(newDate)
        }
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersection, observerOptions)

    // data-date属性を持つ要素を監視
    const dateElements = container.querySelectorAll('[data-date]')
    dateElements.forEach(element => {
      observerRef.current?.observe(element)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [containerRef, entries, onDateChange, enableSnapScroll])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
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
