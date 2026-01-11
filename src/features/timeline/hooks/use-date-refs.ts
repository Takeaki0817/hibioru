'use client'

import { useRef, useCallback } from 'react'

interface UseDateRefsResult {
  /** 日付要素のMapへの参照 */
  dateRefs: React.RefObject<Map<string, HTMLDivElement>>
  /** 日付要素のref設定関数 */
  setDateRef: (dateKey: string) => (element: HTMLDivElement | null) => void
}

/**
 * 日付要素へのRef管理を行うカスタムフック
 *
 * 責務:
 * - 日付キーと対応するDOM要素のMapを管理
 * - ref設定のコールバック関数を提供
 */
export function useDateRefs(): UseDateRefsResult {
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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

  return {
    dateRefs,
    setDateRef,
  }
}
