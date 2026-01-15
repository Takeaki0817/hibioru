'use client'

import { useRef, useEffect, useState, useTransition } from 'react'
import type { StoreApi } from 'zustand'
import type { TimelineStore } from '../stores/timeline-store'
import { TIMELINE_CONFIG } from '../constants'

const { DETECTION_OFFSET_PX } = TIMELINE_CONFIG

interface UseDateDetectionOptions {
  /** コンテナ要素への参照 */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 日付要素のMapへの参照 */
  dateRefs: React.RefObject<Map<string, HTMLDivElement>>
  /** 表示中の日付リスト（依存配列用） */
  displayedDates: string[]
  /** ストアAPI（syncSource確認用） */
  storeApi: StoreApi<TimelineStore>
  /** 初期日付文字列 */
  initialDateStr: string
  /** 日付変更時のコールバック */
  onDateChange?: (date: Date) => void
}

interface UseDateDetectionResult {
  /** 現在表示中の日付文字列（YYYY-MM-DD） */
  visibleDate: string
  /** 現在表示中の日付文字列への参照（同期用） */
  visibleDateRef: React.RefObject<string>
  /** 日付変更のトランジションが保留中かどうか */
  isPending: boolean
}

/**
 * スクロール時に検出ラインにある日付を検出するカスタムフック
 * 検出ライン: ヘッダー下辺から12px下の位置
 */
export function useDateDetection({
  containerRef,
  dateRefs,
  displayedDates,
  storeApi,
  initialDateStr,
  onDateChange,
}: UseDateDetectionOptions): UseDateDetectionResult {
  const [visibleDate, setVisibleDate] = useState<string>(initialDateStr)
  const visibleDateRef = useRef<string>(initialDateStr)
  const [isPending, startTransition] = useTransition()
  // onDateChange をrefで保持（再作成防止）
  const onDateChangeRef = useRef(onDateChange)

  // propsの最新値をrefに同期
  useEffect(() => {
    onDateChangeRef.current = onDateChange
  }, [onDateChange])

  // スクロール時に検知ラインにある日付を検出
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const detectionOffset = DETECTION_OFFSET_PX
    let rafId: number | null = null

    const detectDateAtLine = () => {
      // カルーセルからの同期中はスキップ（意図しない日付変更を防止）
      // ストアから直接取得することで、Reactの更新サイクルに依存しない
      if (storeApi.getState().syncSource === 'carousel') return

      const containerRect = container.getBoundingClientRect()
      const detectionLineY = containerRect.top + detectionOffset

      // 全ての日付セクションをチェック
      for (const [dateKey, element] of dateRefs.current) {
        const rect = element.getBoundingClientRect()
        if (rect.top <= detectionLineY && rect.bottom >= detectionLineY) {
          if (dateKey !== visibleDateRef.current) {
            visibleDateRef.current = dateKey
            setVisibleDate(dateKey)
            // 日付変更を非緊急更新としてマーク（スクロールのブロッキングを防止）
            startTransition(() => {
              onDateChangeRef.current?.(new Date(dateKey))
            })
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
  }, [containerRef, dateRefs, displayedDates, storeApi])

  return {
    visibleDate,
    visibleDateRef,
    isPending,
  }
}
