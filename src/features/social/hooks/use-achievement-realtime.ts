'use client'

import { useCallback } from 'react'
import { useSocialRealtime } from './use-social-realtime'
import type { RealtimePayload } from './use-social-realtime'

/**
 * アチーブメントRealtime購読フック
 *
 * 責務:
 * - Supabase Realtime購読
 * - 新規アチーブメントのイベントハンドリング
 * - フィードへのアイテム追加/削除ロジック
 *
 * 設計:
 * - useSocialRealtimeをラップし、アチーブメント用のイベント処理を提供
 * - DELETEイベントは削除キューに追加（アニメーション用）
 * - INSERT/UPDATEイベントはフィード再取得
 */

export interface UseAchievementRealtimeOptions {
  // 現在のユーザーID
  currentUserId: string | undefined
  // フォロー中ユーザーIDリスト
  followingIds: string[]
  // フィードを再取得する関数（useSocialFeedから）
  invalidateFeed: () => void
  // 削除キューに追加する関数（useDeleteQueueから）
  addToDeletingQueue: (id: string) => void
}

export function useAchievementRealtime({
  currentUserId,
  followingIds,
  invalidateFeed,
  addToDeletingQueue,
}: UseAchievementRealtimeOptions): void {
  // アチーブメント変更時のハンドラー
  const handleAchievementChange = useCallback(
    (event: RealtimePayload) => {
      if (event.eventType === 'DELETE') {
        const oldRecord = event.old as { id?: string } | null
        if (oldRecord?.id) {
          // 削除予定キューに追加（アニメーション後に実際に削除）
          addToDeletingQueue(oldRecord.id)
        } else {
          // IDが取得できない場合はフィード全体を再取得
          invalidateFeed()
        }
      } else {
        // INSERT/UPDATE: フィードを再取得
        invalidateFeed()
      }
    },
    [addToDeletingQueue, invalidateFeed]
  )

  // Realtime購読を開始
  useSocialRealtime({
    isFeedActive: true,
    currentUserId,
    followingUserIds: followingIds,
    onAchievementChange: handleAchievementChange,
  })
}
