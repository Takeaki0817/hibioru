'use client'

import { useState, useEffect, useCallback } from 'react'
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
          <TabsTrigger value="following" className="flex-1">
            <Users className="size-4 mr-1" />
            フォロー中 ({followingCount})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">
            <UserPlus className="size-4 mr-1" />
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
    return (
      <div className="text-center py-8 text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="size-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">まだ誰もフォローしていません</p>
        <p className="text-sm">
          ユーザーを検索してフォローしてみましょう
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
    </div>
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
    return (
      <div className="text-center py-8 text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UserPlus className="size-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">まだフォロワーはいません</p>
        <p className="text-sm">
          記録を続けてフォロワーを増やしましょう
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
    </div>
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
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Avatar className="size-10">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
        <AvatarFallback>
          {user.displayName?.charAt(0) ?? user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.displayName}</p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>

      {showFollowButton && <FollowButton userId={user.id} />}
    </div>
  )
}
