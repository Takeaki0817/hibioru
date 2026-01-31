'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bell, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ListSkeleton } from '@/components/ui/list-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useSocialNotifications } from '../hooks/use-social-notifications'
import { useSocialRealtime } from '../hooks/use-social-realtime'
import { useFollowingIds } from '../hooks/use-following-ids'
import { useCurrentUserId } from '../hooks/use-current-user-id'
import { FollowButton } from './follow-button'
import type { SocialNotificationItem } from '../types'
import { ACHIEVEMENT_ICONS, ACHIEVEMENT_TYPE_LABELS } from '../constants'
import { getTimeAgo } from '@/lib/date-utils'
import { listContainerVariants, notificationItemVariants } from '@/lib/animations'

/**
 * ソーシャル通知タブ
 * お祝い・フォロー通知を表示
 * Supabase Realtimeで新着通知をリアルタイム受信
 */
export function SocialNotificationsTab() {
  // 現在のユーザーIDを取得
  const { userId: currentUserId } = useCurrentUserId()

  // 通知取得
  const {
    notifications,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    invalidateNotifications,
  } = useSocialNotifications()

  // フォロー中のユーザーIDを取得
  const { followingIds } = useFollowingIds()

  // フォロー中ユーザーIDのセット（パフォーマンス最適化）
  const followingIdsSet = useMemo(() => new Set(followingIds), [followingIds])

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
        <ListSkeleton variant="notification" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="通知はありません"
          description="フォロワーからのお祝いや新しいフォロワーの通知がここに表示されます"
        />
      ) : (
        <motion.div
          role="list"
          aria-label="通知一覧"
          data-testid="notification-list"
          className="space-y-4"
          variants={listContainerVariants}
          initial="initial"
          animate="animate"
        >
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              currentUserId={currentUserId}
              isFollowing={followingIdsSet.has(notification.fromUser.id)}
            />
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
  currentUserId: string | undefined
  isFollowing: boolean
}

function NotificationItem({ notification, currentUserId, isFollowing }: NotificationItemProps) {
  const timeAgo = getTimeAgo(notification.createdAt)

  // 通知内容のラベル
  const notificationLabel =
    notification.type === 'celebration' && notification.achievement
      ? `${notification.fromUser.displayName}さんがあなたの達成をお祝いしました`
      : `${notification.fromUser.displayName}さんがあなたをフォローしました`

  // フォロー通知の場合、フォローバックボタンを表示するかどうか
  // 自分自身には表示しない
  const showFollowButton =
    notification.type === 'follow' &&
    currentUserId &&
    notification.fromUser.id !== currentUserId

  return (
    <motion.div
      role="listitem"
      aria-label={`${notificationLabel}（${timeAgo}）`}
      data-testid="notification-item"
      variants={notificationItemVariants}
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
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{notification.fromUser.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{notification.fromUser.username} · {timeAgo}
              </p>
            </div>
            {/* フォロー通知の場合、フォローバックボタンを表示 */}
            {showFollowButton && (
              <FollowButton
                userId={notification.fromUser.id}
                username={notification.fromUser.username}
                initialIsFollowing={isFollowing}
                size="sm"
              />
            )}
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

