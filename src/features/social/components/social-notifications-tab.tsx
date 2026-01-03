'use client'

import { useState, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, PartyPopper, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSocialNotifications, markAllAsRead } from '../api/notifications'
import type { SocialNotificationItem } from '../types'
import { ACHIEVEMENT_ICONS, ACHIEVEMENT_TYPE_LABELS } from '../constants'
import { queryKeys } from '@/lib/constants/query-keys'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// アニメーション設定
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.03 },
  },
}

const notificationVariants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
}

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyNotificationsState />
      ) : (
        <motion.div
          className="space-y-2"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}

          {hasNextPage && (
            <motion.button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950"
              whileTap={{ scale: 0.98 }}
            >
              {isFetchingNextPage ? '読み込み中...' : 'もっと見る'}
            </motion.button>
          )}
        </motion.div>
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
    <motion.div
      variants={notificationVariants}
      className={cn(
        'p-4 rounded-xl border transition-all',
        notification.isRead
          ? 'bg-card border-border'
          : 'bg-primary-50/50 border-primary-200/50 dark:bg-primary-950/50 dark:border-primary-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="flex-shrink-0 mt-0.5">
          {notification.type === 'celebration' ? (
            <div className="size-8 rounded-full bg-accent-50 dark:bg-accent-900/30 flex items-center justify-center">
              <PartyPopper className="size-4 text-accent-500" />
            </div>
          ) : (
            <div className="size-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <UserPlus className="size-4 text-primary-500" />
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-6 ring-1 ring-primary-100 dark:ring-primary-900">
              <AvatarImage
                src={notification.fromUser.avatarUrl ?? undefined}
                alt={notification.fromUser.displayName}
              />
              <AvatarFallback className="text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                {notification.fromUser.displayName?.charAt(0) ??
                  notification.fromUser.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium truncate">{notification.fromUser.displayName}</span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {notification.type === 'celebration' && notification.achievement ? (
              <>
                あなたの「{ACHIEVEMENT_TYPE_LABELS[notification.achievement.type]}
                {notification.achievement.threshold}」達成をお祝いしました{' '}
                {ACHIEVEMENT_ICONS[notification.achievement.type]}
              </>
            ) : (
              'あなたをフォローしました'
            )}
          </p>

          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>
    </motion.div>
  )
}

// 空状態
function EmptyNotificationsState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="size-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <Bell className="size-8 text-primary-400" />
      </div>
      <h3 className="font-medium text-lg mb-2">通知はありません</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        フォロワーからのお祝いや新しいフォロワーの通知がここに表示されます
      </p>
    </motion.div>
  )
}

// スケルトンローディング
function NotificationsSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
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
