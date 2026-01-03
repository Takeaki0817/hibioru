'use client'

import { useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { UserSearch } from './user-search'
import { CelebrateButton } from './celebrate-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSocialFeed } from '../api/timeline'
import type { SocialFeedItem } from '../types'
import { ACHIEVEMENT_ICONS, getAchievementMessage } from '../constants'
import { queryKeys } from '@/lib/constants/query-keys'
import { createClient } from '@/lib/supabase/client'

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
      const { data: { user } } = await supabase.auth.getUser()
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
    queryClient.setQueryData(
      [...queryKeys.social.all, 'feed'],
      (oldData: typeof data) => {
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
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* ユーザー検索セクション */}
      <UserSearch />

      {/* フィードセクション */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">みんなの記録</h3>

        {isLoading && feedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            読み込み中...
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">フィードはまだありません</p>
            <p className="text-sm">
              ユーザーをフォローすると、<br />
              達成や共有投稿がここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedItems.map((item) => (
              <FeedItem
                key={item.id}
                item={item}
                onCelebrationToggle={handleCelebrationToggle}
              />
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
    </div>
  )
}

interface FeedItemProps {
  item: SocialFeedItem
  onCelebrationToggle: (itemId: string, isCelebrated: boolean) => void
}

function FeedItem({ item, onCelebrationToggle }: FeedItemProps) {
  const timeAgo = getTimeAgo(item.createdAt)

  return (
    <div className="p-4 rounded-lg border bg-card">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={item.user.avatarUrl ?? undefined} alt={item.user.displayName} />
            <AvatarFallback>
              {item.user.displayName?.charAt(0) ?? item.user.username.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{item.user.displayName}</p>
            <p className="text-xs text-muted-foreground">@{item.user.username} · {timeAgo}</p>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      {item.type === 'achievement' && item.achievement && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">
            {ACHIEVEMENT_ICONS[item.achievement.type]}
          </span>
          <span className="font-medium">
            {getAchievementMessage(item.achievement.type, item.achievement.threshold)}
          </span>
        </div>
      )}

      {item.type === 'shared_entry' && item.entry && (
        <div className="mb-3">
          <p className="text-sm whitespace-pre-wrap">{item.entry.content}</p>
          {item.entry.imageUrls && item.entry.imageUrls.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {item.entry.imageUrls.slice(0, 4).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt=""
                  className="w-20 h-20 object-cover rounded-md"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between pt-2 border-t">
        <CelebrateButton
          achievementId={item.id}
          initialIsCelebrated={item.isCelebrated}
          celebrationCount={item.celebrationCount}
          onToggle={(isCelebrated) => onCelebrationToggle(item.id, isCelebrated)}
        />
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
