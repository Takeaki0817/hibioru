'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, PartyPopper, Loader2 } from 'lucide-react'
import { UserSearch } from './user-search'
import { FollowStatsSection } from './follow-stats-section'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSocialFeed } from '../api/timeline'
import { celebrateAchievement, uncelebrateAchievement } from '../api/achievements'
import type { SocialFeedItem } from '../types'
import { ACHIEVEMENT_ICONS, getAchievementMessage } from '../constants'
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
    transition: { staggerChildren: 0.05 },
  },
}

const feedItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
}

// パーティクル設定（派手版）
const PARTICLE_COUNT = 12
const PARTICLE_COLORS = [
  'bg-celebrate-300',
  'bg-celebrate-400',
  'bg-celebrate-500',
  'bg-accent-400', // 赤の差し色
]
const generateParticles = () =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i + Math.random() * 30 - 15,
    distance: 40 + Math.random() * 10, // 40-50px のランダム距離
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: Math.random() > 0.5 ? 'size-2.5' : 'size-2', // ランダムサイズ
    delay: Math.random() * 0.1, // 少しずらして発射
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
  const queryClient = useQueryClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...queryKeys.social.all, 'feed'],
    queryFn: async ({ pageParam }) => {
      const result = await getSocialFeed(pageParam)
      if (!result.ok) {
        throw new Error('Failed to fetch social feed')
      }
      return result.value
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  })

  // Supabase Realtimeでachievementsテーブルの変更をサブスクライブ
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // achievementsテーブルの新規追加を監視
      // フォロー中ユーザーのフィルタリングはサーバー側で行うため、全INSERTを監視
      channel = supabase
        .channel('achievements_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'achievements',
          },
          () => {
            // 新しい達成が来たらrefetch
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

  // ページをフラット化してフィードアイテムを取得
  const feedItems = data?.pages.flatMap((page) => page.items) ?? []

  const handleCelebrationToggle = (itemId: string, isCelebrated: boolean) => {
    // 楽観的更新：キャッシュを直接更新
    queryClient.setQueryData([...queryKeys.social.all, 'feed'], (oldData: typeof data) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  isCelebrated,
                  celebrationCount: item.celebrationCount + (isCelebrated ? 1 : -1),
                }
              : item
          ),
        })),
      }
    })
  }

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
        ) : feedItems.length === 0 ? (
          <EmptyFeedState />
        ) : (
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            {feedItems.map((item) => (
              <FeedItem
                key={item.id}
                item={item}
                onCelebrationToggle={handleCelebrationToggle}
              />
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
    </div>
  )
}

interface FeedItemProps {
  item: SocialFeedItem
  onCelebrationToggle: (itemId: string, isCelebrated: boolean) => void
}

function FeedItem({ item, onCelebrationToggle }: FeedItemProps) {
  const queryClient = useQueryClient()
  const timeAgo = getTimeAgo(item.createdAt)
  const [isCelebrated, setIsCelebrated] = useState(item.isCelebrated)
  const [isPending, startTransition] = useTransition()
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<
    { id: number; angle: number; distance: number; color: string; size: string; delay: number }[]
  >([])

  const handleClick = useCallback(() => {
    startTransition(async () => {
      if (isCelebrated) {
        const result = await uncelebrateAchievement(item.id)
        if (result.ok) {
          setIsCelebrated(false)
          onCelebrationToggle(item.id, false)
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      } else {
        const result = await celebrateAchievement(item.id)
        if (result.ok) {
          setIsCelebrated(true)
          onCelebrationToggle(item.id, true)
          // パーティクルエフェクト
          setParticles(generateParticles())
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 600)
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      }
    })
  }, [item.id, isCelebrated, onCelebrationToggle, queryClient])

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      variants={feedItemVariants}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      className={cn(
        'relative w-full text-left rounded-xl transition-all',
        'disabled:pointer-events-none disabled:opacity-70',
        isCelebrated
          ? // お祝い済み: 落ち着いたゴールド背景
            'border border-celebrate-200 bg-celebrate-50/50 dark:border-celebrate-300/30 dark:bg-celebrate-100/20'
          : // 未お祝い: 点線ボーダーで押下可能感を強調
            'border-2 border-dashed border-muted-foreground/30 bg-card hover:border-celebrate-300 hover:bg-celebrate-50/30 dark:hover:bg-celebrate-100/10 hover:shadow-md cursor-pointer'
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
              <span className="text-2xl">{ACHIEVEMENT_ICONS[item.achievement.type]}</span>
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
                    custom={{ angle: particle.angle, distance: particle.distance, delay: particle.delay }}
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
