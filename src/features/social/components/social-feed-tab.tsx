'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { UserSearch } from './user-search'
import { FollowStatsSection } from './follow-stats-section'
import { FeedItem } from './feed-item'
import { ListSkeleton } from '@/components/ui/list-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useSocialFeed } from '../hooks/use-social-feed'
import { useFollowingIds } from '../hooks/use-following-ids'
import { useCurrentUserId } from '../hooks/use-current-user-id'
import { useDeleteQueue } from '../hooks/use-delete-queue'
import { useAchievementRealtime } from '../hooks/use-achievement-realtime'

/**
 * ソーシャルフィードタブ
 * フォロー中ユーザーの達成・共有投稿を表示
 * Supabase Realtimeでフォロー中ユーザーの達成をリアルタイム受信
 */
export function SocialFeedTab() {
  // 現在のユーザーIDを取得
  const { userId: currentUserId } = useCurrentUserId()

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

  // 削除予定アイテム管理
  const { addToDeletingQueue, filterOutDeleting } = useDeleteQueue({
    onDeleteComplete: removeFeedItem,
  })

  // Realtime購読: 他ユーザーの達成を検知
  useAchievementRealtime({
    currentUserId,
    followingIds,
    invalidateFeed,
    addToDeletingQueue,
  })

  // 削除予定のアイテムを除外した表示用リスト
  const visibleFeedItems = useMemo(
    () => filterOutDeleting(feedItems),
    [feedItems, filterOutDeleting]
  )

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
          <ListSkeleton variant="feed" />
        ) : visibleFeedItems.length === 0 ? (
          <EmptyState
            icon={Users}
            title="みんなの記録を見よう"
            description="ユーザーをフォローすると、達成や共有投稿がここに表示されます"
          />
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
