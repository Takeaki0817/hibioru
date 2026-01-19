'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, AlertCircle, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ListSkeleton } from '@/components/ui/list-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { getFollowingList, getFollowerList } from '../api/follows'
import { useFollowList } from '../hooks/use-follow-list'
import { FollowButton } from './follow-button'
import { ANIMATION_CONFIG, ERROR_MESSAGES } from '../constants'
import type { PublicUserInfo } from '../types'

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.03 },
  },
}

const itemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: ANIMATION_CONFIG.springDefault,
  },
}

interface FollowListPageProps {
  userId: string
  type: 'following' | 'followers'
}

/**
 * フォロー/フォロワーリストページ用コンポーネント
 */
export function FollowListPage({ userId, type }: FollowListPageProps) {
  const fetchFn = useMemo(
    () => (type === 'following' ? getFollowingList : getFollowerList),
    [type]
  )
  const { users, isLoading, hasMore, nextCursor, error, loadMore, retryFetch } =
    useFollowList({ fetchFn })

  if (isLoading && users.length === 0) {
    return <ListSkeleton variant="user" count={5} />
  }

  if (error && users.length === 0) {
    return <ErrorState message={error} onRetry={retryFetch} />
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={type === 'following' ? Users : UserPlus}
        title={
          type === 'following'
            ? 'まだ誰もフォローしていません'
            : 'まだフォロワーはいません'
        }
        description={
          type === 'following'
            ? 'ユーザーを検索してフォローしてみましょう'
            : '記録を続けてフォロワーを増やしましょう'
        }
      />
    )
  }

  return (
    <motion.div
      role="list"
      aria-label={type === 'following' ? 'フォロー中のユーザー' : 'フォロワー'}
      className="space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} />
      ))}

      {hasMore && nextCursor && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => loadMore(nextCursor)}
          disabled={isLoading}
          aria-label={
            type === 'following'
              ? 'さらにフォロー中のユーザーを読み込む'
              : 'さらにフォロワーを読み込む'
          }
          aria-busy={isLoading}
        >
          {isLoading ? '読み込み中...' : 'もっと見る'}
        </Button>
      )}
    </motion.div>
  )
}

interface UserListItemProps {
  user: PublicUserInfo
}

/**
 * ユーザーリストアイテム
 */
function UserListItem({ user }: UserListItemProps) {
  return (
    <motion.div
      data-testid="follow-list-item"
      role="listitem"
      aria-label={`${user.displayName} (@${user.username})`}
      variants={itemVariants}
      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-primary-50/50 dark:hover:bg-primary-950/50"
    >
      {/* アバター画像: 親要素のaria-labelでユーザー情報を提供しているため装飾画像として扱う */}
      <Avatar className="size-10 ring-2 ring-primary-100 dark:ring-primary-900">
        <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
        <AvatarFallback
          className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400"
          aria-hidden="true"
        >
          {user.displayName?.charAt(0) ?? user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.displayName}</p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>

      <FollowButton userId={user.id} username={user.displayName} size="sm" />
    </motion.div>
  )
}

// エラー状態
interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="size-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <h3 className="font-medium text-lg mb-2">{ERROR_MESSAGES.LOAD_FAILED}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="size-4" />
        {ERROR_MESSAGES.RETRY}
      </Button>
    </motion.div>
  )
}
