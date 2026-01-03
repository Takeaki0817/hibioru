'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus } from 'lucide-react'
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getFollowingList, getFollowerList } from '../api/follows'
import { FollowButton } from './follow-button'
import type { PublicUserInfo } from '../types'

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

const itemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition,
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
  const [users, setUsers] = useState<PublicUserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const loadUsers = useCallback(async (cursor?: string) => {
    setIsLoading(true)
    const result = await getFollowingList(cursor)
    setIsLoading(false)

    if (result.ok) {
      if (cursor) {
        setUsers((prev) => [...prev, ...result.value.items])
      } else {
        setUsers(result.value.items)
      }
      setNextCursor(result.value.nextCursor)
      setHasMore(!!result.value.nextCursor)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  if (isLoading && users.length === 0) {
    return <ListSkeleton />
  }

  if (users.length === 0) {
    return (
      <EmptyListState
        icon={Users}
        title="まだ誰もフォローしていません"
        description="ユーザーを検索してフォローしてみましょう"
      />
    )
  }

  return (
    <motion.div
      className="space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} showFollowButton={true} />
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => loadUsers(nextCursor ?? undefined)}
          disabled={isLoading}
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
  const [users, setUsers] = useState<PublicUserInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const loadUsers = useCallback(async (cursor?: string) => {
    setIsLoading(true)
    const result = await getFollowerList(cursor)
    setIsLoading(false)

    if (result.ok) {
      if (cursor) {
        setUsers((prev) => [...prev, ...result.value.items])
      } else {
        setUsers(result.value.items)
      }
      setNextCursor(result.value.nextCursor)
      setHasMore(!!result.value.nextCursor)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  if (isLoading && users.length === 0) {
    return <ListSkeleton />
  }

  if (users.length === 0) {
    return (
      <EmptyListState
        icon={UserPlus}
        title="まだフォロワーはいません"
        description="記録を続けてフォロワーを増やしましょう"
      />
    )
  }

  return (
    <motion.div
      className="space-y-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {users.map((user) => (
        <UserListItem key={user.id} user={user} showFollowButton={true} />
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => loadUsers(nextCursor ?? undefined)}
          disabled={isLoading}
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
      variants={itemVariants}
      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-primary-50/50 dark:hover:bg-primary-950/50"
    >
      <Avatar className="size-10 ring-2 ring-primary-100 dark:ring-primary-900">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
        <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
          {user.displayName?.charAt(0) ?? user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.displayName}</p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>

      {showFollowButton && <FollowButton userId={user.id} />}
    </motion.div>
  )
}

// スケルトンローディング
function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="size-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// 空状態
interface EmptyListStateProps {
  icon: typeof Users
  title: string
  description: string
}

function EmptyListState({ icon: Icon, title, description }: EmptyListStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="size-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <Icon className="size-8 text-primary-400" />
      </div>
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  )
}
