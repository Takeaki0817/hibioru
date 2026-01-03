'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Realtimeイベントペイロード型
export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: Record<string, unknown> | null
  new: Record<string, unknown> | null
}

export interface UseSocialRealtimeOptions {
  // フィードタブがマウントされているか
  isFeedActive?: boolean
  // 通知タブがマウントされているか
  isNotificationsActive?: boolean
  // 現在のユーザーID
  currentUserId?: string
  // フォロー中ユーザーIDリスト
  followingUserIds?: string[]
  // 達成変更時のコールバック
  onAchievementChange?: (payload: RealtimePayload) => void
  // 通知挿入時のコールバック
  onNotificationInsert?: (payload: RealtimePayload) => void
}

/**
 * ソーシャル機能のRealtime購読を一元管理
 *
 * 責務:
 * - Supabase Realtimeチャネルの作成・破棄
 * - フィルター条件の適用（フォロー中ユーザーのみ監視）
 * - イベント種別に応じたキャッシュ更新のディスパッチ
 *
 * 設計方針:
 * - Realtimeは「他ユーザーの変更検知」のみに使用
 * - 自分の操作は楽観的更新で即時反映
 */
export function useSocialRealtime({
  isFeedActive = false,
  isNotificationsActive = false,
  currentUserId,
  followingUserIds = [],
  onAchievementChange,
  onNotificationInsert,
}: UseSocialRealtimeOptions): void {
  const channelsRef = useRef<RealtimeChannel[]>([])
  const supabaseRef = useRef(createClient())

  // チャネルのクリーンアップ
  const cleanup = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabaseRef.current.removeChannel(channel)
    })
    channelsRef.current = []
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    cleanup()
    const supabase = supabaseRef.current

    // フィードタブがアクティブな場合のみachievements監視
    if (isFeedActive && followingUserIds.length > 0 && onAchievementChange) {
      // Note: Supabase Realtimeはfilterでuser_id in (...)をサポートしていないため
      // クライアント側でフィルタリング
      // Note: DELETEイベントでis_sharedフィルターが正しく機能しないため、
      // フィルターなしで全イベントを受信し、クライアント側で判定
      const achievementsChannel = supabase
        .channel('social_achievements')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'achievements',
            // フィルターなし: DELETEイベントを正しく受信するため
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            const newRecord = payload.new as Record<string, unknown> | null
            const oldRecord = payload.old as Record<string, unknown> | null

            // DELETE: RLSの制限によりoldレコードにはidのみ含まれる場合がある
            // そのため、idがあれば削除イベントとして処理する
            if (payload.eventType === 'DELETE') {
              const achievementId = oldRecord?.id as string | undefined
              if (achievementId) {
                // DELETEイベントを親に伝播（フィード内に存在すれば削除される）
                onAchievementChange({
                  eventType: 'DELETE',
                  old: oldRecord,
                  new: null,
                })
              }
              return
            }

            // INSERT/UPDATE: newレコードから情報を取得
            const userId = newRecord?.user_id as string | undefined
            const isShared = newRecord?.is_shared as boolean | undefined
            const wasShared = oldRecord?.is_shared as boolean | undefined

            // フォロー中ユーザーでなければスキップ
            if (!userId || !followingUserIds.includes(userId)) return

            if (payload.eventType === 'INSERT' && isShared) {
              // 新規共有投稿
              onAchievementChange({
                eventType: 'INSERT',
                old: null,
                new: newRecord,
              })
            } else if (payload.eventType === 'UPDATE') {
              if (!wasShared && isShared) {
                // 非共有→共有: 新規アイテムとして処理
                onAchievementChange({
                  eventType: 'INSERT',
                  old: null,
                  new: newRecord,
                })
              } else if (wasShared && !isShared) {
                // 共有→非共有: 削除として処理
                onAchievementChange({
                  eventType: 'DELETE',
                  old: oldRecord,
                  new: null,
                })
              } else if (isShared) {
                // 共有状態を維持したまま更新（コンテンツ編集等）
                onAchievementChange({
                  eventType: 'UPDATE',
                  old: oldRecord,
                  new: newRecord,
                })
              }
            }
          }
        )
        .subscribe()

      channelsRef.current.push(achievementsChannel)
    }

    // 通知タブがアクティブな場合のみ通知監視
    if (isNotificationsActive && onNotificationInsert) {
      const notificationsChannel = supabase
        .channel('social_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            onNotificationInsert({
              eventType: 'INSERT',
              old: null,
              new: payload.new as Record<string, unknown>,
            })
          }
        )
        .subscribe()

      channelsRef.current.push(notificationsChannel)
    }

    return cleanup
  }, [
    currentUserId,
    isFeedActive,
    isNotificationsActive,
    followingUserIds,
    onAchievementChange,
    onNotificationInsert,
    cleanup,
  ])
}
