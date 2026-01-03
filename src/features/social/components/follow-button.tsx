'use client'

import { useState, useTransition, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus, UserMinus } from 'lucide-react'
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '../api/follows'
import { queryKeys } from '@/lib/constants/query-keys'

interface FollowButtonProps {
  userId: string
  initialIsFollowing?: boolean
}

/**
 * フォロー/フォロー解除ボタン
 */
export function FollowButton({ userId, initialIsFollowing }: FollowButtonProps) {
  const queryClient = useQueryClient()
  const [isFollowing, setIsFollowing] = useState<boolean | null>(initialIsFollowing ?? null)
  const [isPending, startTransition] = useTransition()

  // 初期フォロー状態を取得
  useEffect(() => {
    if (isFollowing === null) {
      checkIsFollowing(userId).then((result) => {
        if (result.ok) {
          setIsFollowing(result.value)
        }
      })
    }
  }, [userId, isFollowing])

  const handleClick = () => {
    const previousState = isFollowing
    // 楽観的更新: 即座に状態を変更
    setIsFollowing(!isFollowing)

    startTransition(async () => {
      if (previousState) {
        const result = await unfollowUser(userId)
        if (!result.ok) {
          // 失敗時はロールバック
          setIsFollowing(true)
        } else {
          // 成功時にソーシャル関連のクエリを強制的に再取得
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      } else {
        const result = await followUser(userId)
        if (!result.ok) {
          // 失敗時はロールバック
          setIsFollowing(false)
        } else {
          // 成功時にソーシャル関連のクエリを強制的に再取得
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      }
    })
  }

  // ローディング中
  if (isFollowing === null) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="min-w-[100px]"
    >
      {isFollowing ? (
        <>
          {isPending ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <UserMinus className="size-4 mr-1" />
          )}
          フォロー中
        </>
      ) : (
        <>
          {isPending ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <UserPlus className="size-4 mr-1" />
          )}
          フォロー
        </>
      )}
    </Button>
  )
}
