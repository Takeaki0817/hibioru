'use client'

import { useState, useMemo, useCallback } from 'react'

/**
 * 削除予定アイテム管理フック
 *
 * 責務:
 * - deletingIds state管理
 * - exitアニメーション用のアイテム追跡
 * - 削除完了後のクリーンアップ
 *
 * 設計:
 * - 削除アニメーション中のアイテムIDをSetで管理
 * - アニメーション完了後（デフォルト300ms）にコールバックを実行
 * - フィルタリング用のユーティリティを提供
 */

// アニメーション完了時のコールバック型
export type OnDeleteComplete = (id: string) => void

// 削除タイムアウト（ミリ秒）
const DELETE_ANIMATION_DURATION = 300

export interface UseDeleteQueueOptions {
  // アニメーション完了後のコールバック
  onDeleteComplete: OnDeleteComplete
  // アニメーション時間（オプション）
  animationDuration?: number
}

export interface UseDeleteQueueReturn {
  // 削除予定のID Set
  deletingIds: Set<string>
  // 削除予定にアイテムを追加
  addToDeletingQueue: (id: string) => void
  // 削除予定かどうか判定
  isDeletingItem: (id: string) => boolean
  // フィルタリングユーティリティ（削除予定を除外）
  filterOutDeleting: <T extends { id: string }>(items: T[]) => T[]
}

export function useDeleteQueue({
  onDeleteComplete,
  animationDuration = DELETE_ANIMATION_DURATION,
}: UseDeleteQueueOptions): UseDeleteQueueReturn {
  // 削除予定のアイテムID（exitアニメーション用）
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // 削除予定かどうか判定
  const isDeletingItem = useCallback((id: string) => deletingIds.has(id), [deletingIds])

  // 削除予定にアイテムを追加し、アニメーション完了後にクリーンアップ
  const addToDeletingQueue = useCallback(
    (id: string) => {
      // 削除予定としてマーク → exitアニメーションがトリガーされる
      setDeletingIds((prev) => new Set(prev).add(id))

      // exitアニメーション完了後にキャッシュから削除
      setTimeout(() => {
        onDeleteComplete(id)
        setDeletingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, animationDuration)
    },
    [onDeleteComplete, animationDuration]
  )

  // フィルタリングユーティリティ（削除予定を除外）
  const filterOutDeleting = useMemo(
    () =>
      <T extends { id: string }>(items: T[]): T[] =>
        items.filter((item) => !deletingIds.has(item.id)),
    [deletingIds]
  )

  return {
    deletingIds,
    addToDeletingQueue,
    isDeletingItem,
    filterOutDeleting,
  }
}
