'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, PartyPopper, Loader2 } from 'lucide-react'
import { UserSearch } from './user-search'
import { FollowStatsSection } from './follow-stats-section'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSocialFeed } from '../hooks/use-social-feed'
import { useSocialRealtime } from '../hooks/use-social-realtime'
import { useFollowingIds } from '../hooks/use-following-ids'
import { useCelebration } from '../hooks/use-celebration'
import type { SocialFeedItem } from '../types'
import { ACHIEVEMENT_ICONS, getAchievementMessage } from '../constants'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// アニメーション設定
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}

const feedItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

// パーティクル設定（派手版）
const PARTICLE_COUNT = 12
const PARTICLE_COLORS = [
  'bg-celebrate-300',
  'bg-celebrate-400',
  'bg-celebrate-500',
  'bg-accent-400',
]
const generateParticles = () =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i + Math.random() * 30 - 15,
    distance: 40 + Math.random() * 10,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: Math.random() > 0.5 ? 'size-2.5' : 'size-2',
    delay: Math.random() * 0.1,
  }))

const particleVariants = {
  initial: { scale: 0, opacity: 1, rotate: 0 },
  animate: (custom: { angle: number; distance: number; delay: number }) => ({
    scale: [0, 1.8, 0],
    opacity: [1, 1, 0],
    rotate: [0, 220],
    x: Math.cos((custom.angle * Math.PI) / 180) * custom.distance,
    y: Math.sin((custom.angle * Math.PI) / 180) * custom.distance,
    transition: {
      duration: 0.4,
      ease: 'easeInOut' as const,
      delay: custom.delay * 0.5,
    },
  }),
}

/**
 * ソーシャルフィードタブ
 * フォロー中ユーザーの達成・共有投稿を表示
 * Supabase Realtimeでフォロー中ユーザーの達成をリアルタイム受信
 */
export function SocialFeedTab() {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  // 現在のユーザーIDを取得
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id)
    })
  }, [])

  // フォロー中ユーザーIDリストを取得（Realtime用）
  const { followingIds } = useFollowingIds()

  // フィード取得
  const {
    feedItems,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    removeFeedItem,
    invalidateFeed,
  } = useSocialFeed()

  // 削除予定のアイテムID（exitアニメーション用）
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Realtime購読: 他ユーザーの達成を検知
  const handleAchievementChange = useCallback(
    (event: { eventType: string; old: unknown; new: unknown }) => {
      if (event.eventType === 'DELETE') {
        const oldRecord = event.old as { id?: string } | null
        if (oldRecord?.id) {
          const idToDelete = oldRecord.id
          // 削除予定としてマーク → exitアニメーションがトリガーされる
          setDeletingIds((prev) => new Set(prev).add(idToDelete))
          // exitアニメーション完了後（0.3秒）にキャッシュから削除
          setTimeout(() => {
            removeFeedItem(idToDelete)
            setDeletingIds((prev) => {
              const next = new Set(prev)
              next.delete(idToDelete)
              return next
            })
          }, 300)
        } else {
          invalidateFeed()
        }
      } else {
        // INSERT/UPDATE: フィードを再取得
        invalidateFeed()
      }
    },
    [removeFeedItem, invalidateFeed]
  )

  // 削除予定のアイテムを除外した表示用リスト
  const visibleFeedItems = useMemo(
    () => feedItems.filter((item) => !deletingIds.has(item.id)),
    [feedItems, deletingIds]
  )

  useSocialRealtime({
    isFeedActive: true,
    currentUserId,
    followingUserIds: followingIds,
    onAchievementChange: handleAchievementChange,
  })

  return (
    <div className="space-y-6">
      {/* ヘッダー: フォロー統計 + 検索（横並び） */}
      <div className="flex items-center gap-2">
        <FollowStatsSection />
        <div className="flex-1">
          <UserSearch />
        </div>
      </div>

      {/* フィードセクション */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">みんなの記録</h3>
          <p className="text-sm text-muted-foreground">
            みんなの達成や共有をお祝いしましょう。
          </p>
        </div>

        {isLoading && feedItems.length === 0 ? (
          <FeedSkeleton />
        ) : visibleFeedItems.length === 0 ? (
          <EmptyFeedState />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {visibleFeedItems.map((item) => (
                <FeedItem key={item.id} item={item} />
              ))}
            </AnimatePresence>

            {hasNextPage && (
              <motion.button
                onClick={fetchNextPage}
                disabled={isFetchingNextPage}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950"
                whileTap={{ scale: 0.98 }}
              >
                {isFetchingNextPage ? '読み込み中...' : 'もっと見る'}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface FeedItemProps {
  item: SocialFeedItem
}

function FeedItem({ item }: FeedItemProps) {
  const timeAgo = getTimeAgo(item.createdAt)
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<
    { id: number; angle: number; distance: number; color: string; size: string; delay: number }[]
  >([])

  // 成功時のコールバック（パーティクルエフェクト）
  const handleSuccess = useCallback((newState: boolean) => {
    if (newState) {
      setParticles(generateParticles())
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 600)
    }
  }, [])

  const { isCelebrated, isPending, toggle } = useCelebration({
    achievementId: item.id,
    initialIsCelebrated: item.isCelebrated,
    initialCount: item.celebrationCount,
    onSuccess: handleSuccess,
  })

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={isPending}
      variants={feedItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full text-left rounded-xl transition-all',
        'disabled:pointer-events-none disabled:opacity-70',
        isCelebrated
          ? 'border border-celebrate-200 bg-celebrate-50/50 dark:border-celebrate-300/30 dark:bg-celebrate-100/20'
          : 'border-2 border-dashed border-muted-foreground/30 bg-card hover:border-celebrate-300 hover:bg-celebrate-50/30 dark:hover:bg-celebrate-100/10 hover:shadow-md cursor-pointer'
      )}
    >
      {/* 内側div: ボーダー太さの差をpaddingで吸収 */}
      <div className={cn('flex items-start gap-4', isCelebrated ? 'p-[15px]' : 'p-[14px]')}>
        {/* 左側: ヘッダー + コンテンツ */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 dark:ring-primary-900">
              <AvatarImage src={item.user.avatarUrl ?? undefined} alt={item.user.displayName} />
              <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                {item.user.displayName?.charAt(0) ?? item.user.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{item.user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{item.user.username} · {timeAgo}
              </p>
            </div>
          </div>

          {/* コンテンツ */}
          {item.type === 'achievement' && item.achievement && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary-50/50 dark:bg-primary-950/30">
              {(() => {
                const { icon: Icon, color } = ACHIEVEMENT_ICONS[item.achievement.type]
                return <Icon className={`size-6 ${color}`} />
              })()}
              <span className="font-medium text-primary-600 dark:text-primary-400">
                {getAchievementMessage(item.achievement.type, item.achievement.threshold)}
              </span>
            </div>
          )}

          {item.type === 'shared_entry' && item.entry && (
            <div>
              <p className="text-sm whitespace-pre-wrap line-clamp-2">{item.entry.content}</p>
              {item.entry.imageUrls && item.entry.imageUrls.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {item.entry.imageUrls.slice(0, 4).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右側: お祝いアイコン（ステータス表示） */}
        <div className="shrink-0 flex items-center justify-center size-12 rounded-xl relative">
          {isPending ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <motion.div
              animate={showParticles ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <PartyPopper
                className={cn(
                  'size-6 transition-all',
                  isCelebrated
                    ? 'text-celebrate-400 fill-celebrate-400'
                    : 'text-muted-foreground/50'
                )}
              />
            </motion.div>
          )}

          {/* パーティクルエフェクト */}
          <AnimatePresence>
            {showParticles && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {particles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    custom={{
                      angle: particle.angle,
                      distance: particle.distance,
                      delay: particle.delay,
                    }}
                    variants={particleVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0 }}
                    className={cn('absolute rounded-full', particle.size, particle.color)}
                    style={{ originX: 0.5, originY: 0.5 }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  )
}

// 空状態
function EmptyFeedState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="size-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <Users className="size-8 text-primary-400" />
      </div>
      <h3 className="font-medium text-lg mb-2">みんなの記録を見よう</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        ユーザーをフォローすると、達成や共有投稿がここに表示されます
      </p>
    </motion.div>
  )
}

// スケルトンローディング
function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
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
