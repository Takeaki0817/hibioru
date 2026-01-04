'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, PartyPopper, Loader2, Share2, Quote } from 'lucide-react'
import { UserSearch } from './user-search'
import { FollowStatsSection } from './follow-stats-section'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSocialFeed } from '../hooks/use-social-feed'
import { useSocialRealtime } from '../hooks/use-social-realtime'
import { useFollowingIds } from '../hooks/use-following-ids'
import { useFeedItem } from '../hooks/use-feed-item'
import type { SocialFeedItem } from '../types'
import { ACHIEVEMENT_ICONS, ANIMATION_CONFIG, getAchievementMessage } from '../constants'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getTimeAgo } from '@/lib/date-utils'

const feedItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: ANIMATION_CONFIG.springDefault,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

// パーティクルアニメーション設定
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
                aria-label="さらにフィードを読み込む"
                aria-busy={isFetchingNextPage}
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
  const isSharedEntry = item.type === 'shared_entry'

  // useFeedItem でお祝い状態とパーティクルエフェクトを管理
  const { isCelebrated, isPending, toggle, showParticles, particles } = useFeedItem({
    achievementId: item.id,
    initialIsCelebrated: item.isCelebrated,
    initialCount: item.celebrationCount,
  })

  // アクセシブルなラベルを生成
  const contentLabel = isSharedEntry
    ? `${item.user.displayName}さんの共有投稿`
    : item.achievement
      ? `${item.user.displayName}さんの${getAchievementMessage(item.achievement.type, item.achievement.threshold)}`
      : `${item.user.displayName}さんの投稿`

  const ariaLabel = isCelebrated
    ? `${contentLabel}（お祝い済み）。クリックでお祝いを取り消す`
    : `${contentLabel}。クリックでお祝いする`

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isCelebrated}
      aria-label={ariaLabel}
      aria-busy={isPending}
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
              <AvatarImage src={item.user.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" aria-hidden="true">
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

          {/* コンテンツ: 達成 */}
          {item.type === 'achievement' && item.achievement && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary-50/50 dark:bg-primary-950/30">
              {(() => {
                const { icon: Icon, color } = ACHIEVEMENT_ICONS[item.achievement.type]
                return <Icon className={`size-5 shrink-0 ${color}`} />
              })()}
              <span className="text-sm text-primary-600 dark:text-primary-400">
                {getAchievementMessage(item.achievement.type, item.achievement.threshold)}
              </span>
            </div>
          )}

          {/* コンテンツ: 共有投稿 */}
          {isSharedEntry && item.entry && (
            <div className="space-y-2">
              {/* 共有ラベル（通知タブと統一） */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/30">
                <Share2 className="size-5 shrink-0 text-sky-500" />
                <span className="text-sm text-sky-600 dark:text-sky-400">
                  投稿を共有しました
                </span>
              </div>

              {/* 投稿内容カード */}
              <div className="relative rounded-lg bg-card p-3 border border-border">
                {/* 引用マーク */}
                <Quote className="absolute top-2 right-2 size-4 text-muted-foreground/20" />

                {/* テキストコンテンツ */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-3 pr-5">
                  {item.entry.content}
                </p>

                {/* 画像プレビュー */}
                {item.entry.imageUrls && item.entry.imageUrls.length > 0 && (
                  <div className="mt-3">
                    {item.entry.imageUrls.length === 1 ? (
                      /* 画像1枚: 大きく表示 */
                      <div className="relative overflow-hidden rounded-md">
                        <img
                          src={item.entry.imageUrls[0]}
                          alt={`${item.user.displayName}さんの共有画像`}
                          className="w-full max-h-40 object-cover"
                        />
                      </div>
                    ) : (
                      /* 画像2枚以上: グリッド表示 */
                      <div
                        className={cn(
                          'grid gap-1.5',
                          item.entry.imageUrls.length === 2 && 'grid-cols-2',
                          item.entry.imageUrls.length >= 3 && 'grid-cols-3'
                        )}
                      >
                        {item.entry.imageUrls.slice(0, 3).map((url, index) => (
                          <div
                            key={index}
                            className="relative aspect-square overflow-hidden rounded-md"
                          >
                            <img
                              src={url}
                              alt={`${item.user.displayName}さんの共有画像 ${index + 1}`}
                              className="size-full object-cover"
                            />
                            {/* 残り枚数表示 */}
                            {index === 2 && item.entry!.imageUrls!.length > 3 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-medium">
                                +{item.entry!.imageUrls!.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
    <div role="status" aria-busy="true" aria-label="フィードを読み込み中" className="space-y-4">
      <span className="sr-only">フィードを読み込み中...</span>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card" aria-hidden="true">
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
