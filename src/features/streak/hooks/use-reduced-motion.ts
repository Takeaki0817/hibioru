'use client'

import { useSyncExternalStore } from 'react'

/**
 * メディアクエリの購読を作成
 */
function createMediaQuerySubscribe(query: string) {
  return (callback: () => void): (() => void) => {
    if (typeof window === 'undefined') {
      return () => {}
    }

    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener('change', callback)

    return () => {
      mediaQuery.removeEventListener('change', callback)
    }
  }
}

/**
 * クライアント側でのメディアクエリ値取得
 */
function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * サーバー側でのスナップショット（常にfalse）
 */
function getServerSnapshot(): boolean {
  return false
}

// モジュールレベルでsubscribe関数を作成（再生成を防止）
const subscribe = createMediaQuerySubscribe('(prefers-reduced-motion: reduce)')

/**
 * prefers-reduced-motion メディアクエリを監視するフック
 *
 * ユーザーのOSレベルでの「視覚効果を減らす」設定を検出し、
 * アクセシビリティ対応のためのフラグを提供する。
 *
 * @returns true - 視覚効果を減らすべき / false - 通常表示
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * return (
 *   <motion.div
 *     animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
 *   />
 * )
 * ```
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    getReducedMotionSnapshot,
    getServerSnapshot
  )
}
