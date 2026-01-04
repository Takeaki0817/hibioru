'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bell, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSocialNotifications } from '../hooks/use-social-notifications'
import { useSocialRealtime } from '../hooks/use-social-realtime'
import type { SocialNotificationItem } from '../types'
import { ACHIEVEMENT_ICONS, ACHIEVEMENT_TYPE_LABELS, ANIMATION_CONFIG } from '../constants'
import { createClient } from '@/lib/supabase/client'
import { getTimeAgo } from '@/lib/date-utils'

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
    transition: ANIMATION_CONFIG.springDefault,
  },
}

/**
 * ソーシャル通知タブ
 * お祝い・フォロー通知を表示
 * Supabase Realtimeで新着通知をリアルタイム受信
 */
export function SocialNotificationsTab() {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  // 現在のユーザーIDを取得
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id)
    })
  }, [])

  // 通知取得
  const {
    notifications,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    invalidateNotifications,
  } = useSocialNotifications()

  // Realtime購読: 新着通知を検知
  const handleNotificationInsert = useCallback(() => {
    invalidateNotifications()
  }, [invalidateNotifications])

  useSocialRealtime({
    isNotificationsActive: true,
    currentUserId,
    onNotificationInsert: handleNotificationInsert,
  })

  return (
    <div className="space-y-4">
      {/* 通知リスト */}
      {isLoading && notifications.length === 0 ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyNotificationsState />
      ) : (
        <motion.div
          role="list"
          aria-label="通知一覧"
          className="space-y-4"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}

          {hasNextPage && (
            <motion.button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              aria-label="さらに通知を読み込む"
              aria-busy={isFetchingNextPage}
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

  // 通知内容のラベル
  const notificationLabel =
    notification.type === 'celebration' && notification.achievement
      ? `${notification.fromUser.displayName}さんがあなたの達成をお祝いしました`
      : `${notification.fromUser.displayName}さんがあなたをフォローしました`

  return (
    <motion.div
      role="listitem"
      aria-label={`${notificationLabel}（${timeAgo}）`}
      variants={notificationVariants}
      initial="initial"
      animate="animate"
      className="p-4 rounded-xl border transition-all bg-card border-border"
    >
      <div className="flex items-start gap-4">
        {/* 左側: ヘッダー + コンテンツ */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー: アバター + 名前・時間 */}
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 dark:ring-primary-900">
              <AvatarImage
                src={notification.fromUser.avatarUrl ?? undefined}
                alt=""
              />
              <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" aria-hidden="true">
                {notification.fromUser.displayName?.charAt(0) ??
                  notification.fromUser.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{notification.fromUser.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{notification.fromUser.username} · {timeAgo}
              </p>
            </div>
          </div>

          {/* コンテンツ: 通知メッセージ */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary-50/50 dark:bg-primary-950/30">
            {notification.type === 'celebration' && notification.achievement ? (
              <>
                {(() => {
                  const { icon: Icon, color } = ACHIEVEMENT_ICONS[notification.achievement.type]
                  return <Icon className={`size-5 shrink-0 ${color}`} />
                })()}
                <span className="text-sm text-primary-600 dark:text-primary-400">
                  「{ACHIEVEMENT_TYPE_LABELS[notification.achievement.type]}
                  {notification.achievement.threshold}」達成をお祝いしました
                </span>
              </>
            ) : (
              <>
                <UserPlus className="size-5 shrink-0 text-primary-500" />
                <span className="text-sm text-primary-600 dark:text-primary-400">
                  あなたをフォローしました
                </span>
              </>
            )}
          </div>
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
    <div role="status" aria-busy="true" aria-label="通知を読み込み中" className="space-y-4">
      <span className="sr-only">通知を読み込み中...</span>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card" aria-hidden="true">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  )
}
