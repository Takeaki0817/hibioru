'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, AlertCircle, RefreshCw } from 'lucide-react'
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

interface FollowListContentProps {
  defaultTab: 'following' | 'followers'
  followingCount: number
  followerCount: number
}

/**
 * フォロー/フォロワーリストのコンテンツ
 * SheetContent 内で使用
 */
export function FollowListContent({
  defaultTab,
  followingCount,
  followerCount,
}: FollowListContentProps) {
  return (
    <div className="max-w-2xl mx-auto w-full">
      <SheetHeader className="pb-4">
        <SheetTitle>フォロー</SheetTitle>
        <SheetDescription className="sr-only">
          フォロー中のユーザーとフォロワーを確認できます
        </SheetDescription>
      </SheetHeader>

      <Tabs defaultValue={defaultTab} className="h-full">
        <TabsList className="w-full">
          <TabsTrigger value="following" className="flex-1 gap-1.5">
            <Users className="size-4" />
            フォロー中 ({followingCount})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1 gap-1.5">
            <UserPlus className="size-4" />
            フォロワー ({followerCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4 h-[calc(100%-80px)] overflow-y-auto">
          <FollowingList />
        </TabsContent>

        <TabsContent value="followers" className="mt-4 h-[calc(100%-80px)] overflow-y-auto">
          <FollowerList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * フォロー中ユーザーリスト
 */
function FollowingList() {
  // fetchFn を安定化（再レンダー時に同じ参照を維持）
  const fetchFn = useMemo(() => getFollowingList, [])
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
        icon={Users}
        title="まだ誰もフォローしていません"
        description="ユーザーを検索してフォローしてみましょう"
      />
    )
  }

  return (
    <motion.div
      role="list"
      aria-label="フォロー中のユーザー"
      className="space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} showFollowButton={true} />
      ))}

      {hasMore && nextCursor && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => loadMore(nextCursor)}
          disabled={isLoading}
          aria-label="さらにフォロー中のユーザーを読み込む"
          aria-busy={isLoading}
        >
          {isLoading ? '読み込み中...' : 'もっと見る'}
        </Button>
      )}
    </motion.div>
  )
}

/**
 * フォロワーリスト
 */
function FollowerList() {
  // fetchFn を安定化（再レンダー時に同じ参照を維持）
  const fetchFn = useMemo(() => getFollowerList, [])
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
        icon={UserPlus}
        title="まだフォロワーはいません"
        description="記録を続けてフォロワーを増やしましょう"
      />
    )
  }

  return (
    <motion.div
      role="list"
      aria-label="フォロワー"
      className="space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} showFollowButton={true} />
      ))}

      {hasMore && nextCursor && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => loadMore(nextCursor)}
          disabled={isLoading}
          aria-label="さらにフォロワーを読み込む"
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
  showFollowButton: boolean
}

/**
 * ユーザーリストアイテム
 */
function UserListItem({ user, showFollowButton }: UserListItemProps) {
  return (
    <motion.div
      role="listitem"
      aria-label={`${user.displayName} (@${user.username})`}
      variants={itemVariants}
      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-primary-50/50 dark:hover:bg-primary-950/50"
    >
      {/* アバター画像: 親要素のaria-labelでユーザー情報を提供しているため装飾画像として扱う */}
      <Avatar className="size-10 ring-2 ring-primary-100 dark:ring-primary-900">
        <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" aria-hidden="true">
          {user.displayName?.charAt(0) ?? user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.displayName}</p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>

      {showFollowButton && <FollowButton userId={user.id} username={user.displayName} />}
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
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="gap-2"
      >
        <RefreshCw className="size-4" />
        {ERROR_MESSAGES.RETRY}
      </Button>
    </motion.div>
  )
}
