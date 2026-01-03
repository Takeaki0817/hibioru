'use client'

import { useState, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, PartyPopper, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSocialNotifications, markAllAsRead } from '../api/notifications'
import type { SocialNotificationItem } from '../types'
import { ACHIEVEMENT_ICONS, ACHIEVEMENT_TYPE_LABELS } from '../constants'
import { queryKeys } from '@/lib/constants/query-keys'
import { createClient } from '@/lib/supabase/client'

/**
 * ソーシャル通知タブ
 * お祝い・フォロー通知を表示
 * Supabase Realtimeで新着通知をリアルタイム受信
 */
export function SocialNotificationsTab() {
  const queryClient = useQueryClient()
  const [unreadCount, setUnreadCount] = useState(0)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...queryKeys.social.all, 'notifications'],
    queryFn: async ({ pageParam }) => {
      const result = await getSocialNotifications(pageParam)
      if (!result.ok) {
        throw new Error('Failed to fetch notifications')
      }
      // 初回ロード時のみunreadCountを設定
      if (!pageParam) {
        setUnreadCount(result.value.unreadCount)
      }
      return result.value
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  })

  // Supabase Realtimeで新着通知をサブスクライブ
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    // 現在のユーザーIDを取得してサブスクライブ
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('social_notifications_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'social_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // 新しい通知が来たらrefetch
            refetch()
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [refetch])

  // ページをフラット化して通知リストを取得
  const notifications = data?.pages.flatMap((page) => page.items) ?? []

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead()
    if (result.ok) {
      // キャッシュを更新
      queryClient.setQueryData(
        [...queryKeys.social.all, 'notifications'],
        (oldData: typeof data) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((n) => ({ ...n, isRead: true })),
            })),
          }
        }
      )
      setUnreadCount(0)
    }
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
            すべて既読にする
          </Button>
        </div>
      )}

      {/* 通知リスト */}
      {isLoading && notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          読み込み中...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="size-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">通知はありません</p>
          <p className="text-sm">
            フォロワーからのお祝いや<br />
            新しいフォロワーの通知がここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isFetchingNextPage ? '読み込み中...' : 'もっと見る'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface NotificationItemProps {
  notification: SocialNotificationItem
}

function NotificationItem({ notification }: NotificationItemProps) {
  const timeAgo = getTimeAgo(notification.createdAt)

  return (
    <div
      className={`p-4 rounded-lg border ${
        notification.isRead ? 'bg-card' : 'bg-accent/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="flex-shrink-0 mt-0.5">
          {notification.type === 'celebration' ? (
            <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <PartyPopper className="size-4 text-amber-600" />
            </div>
          ) : (
            <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus className="size-4 text-blue-600" />
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage
                src={notification.fromUser.avatarUrl ?? undefined}
                alt={notification.fromUser.displayName}
              />
              <AvatarFallback className="text-xs">
                {notification.fromUser.displayName?.charAt(0) ??
                  notification.fromUser.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium truncate">
              {notification.fromUser.displayName}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {notification.type === 'celebration' && notification.achievement ? (
              <>
                あなたの「
                {ACHIEVEMENT_TYPE_LABELS[notification.achievement.type]}
                {notification.achievement.threshold}
                」達成をお祝いしました {ACHIEVEMENT_ICONS[notification.achievement.type]}
              </>
            ) : (
              'あなたをフォローしました'
            )}
          </p>

          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>
    </div>
  )
}

// 相対時間の表示
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
