'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, UserPlus, UserMinus, Check } from 'lucide-react'
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '../api/follows'
import { queryKeys } from '@/lib/constants/query-keys'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  userId: string
  initialIsFollowing?: boolean
  size?: 'default' | 'sm'
}

// スプリングアニメーション設定
const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
}

// アイコンアニメーション
const iconVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
}

/**
 * フォロー/フォロー解除ボタン
 * MotionButton化によりタップ時のスケールアニメーション付き
 */
export function FollowButton({ userId, initialIsFollowing, size = 'default' }: FollowButtonProps) {
  const queryClient = useQueryClient()
  const [isFollowing, setIsFollowing] = useState<boolean | null>(initialIsFollowing ?? null)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)

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

  const handleClick = useCallback(() => {
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
          // 成功アニメーション
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 1000)
          // 成功時にソーシャル関連のクエリを強制的に再取得
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      }
    })
  }, [userId, isFollowing, queryClient])

  const isSmall = size === 'sm'

  // ローディング中
  if (isFollowing === null) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-md border border-border bg-background',
          isSmall ? 'h-7 px-2' : 'h-8 px-3'
        )}
      >
        <Loader2 className={cn('animate-spin text-muted-foreground', isSmall ? 'size-3.5' : 'size-4')} />
      </div>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      whileTap={{ scale: 0.95 }}
      transition={springTransition}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-md font-medium',
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        isSmall ? 'h-7 px-2 text-xs min-w-[72px]' : 'h-8 px-3 text-sm gap-1.5 min-w-[100px]',
        isFollowing
          ? 'border border-border bg-background hover:bg-accent/50 text-foreground'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      )}
    >
      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div
            key="loading"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
            <Loader2 className={cn('animate-spin', isSmall ? 'size-3.5' : 'size-4')} />
          </motion.div>
        ) : showSuccess ? (
          <motion.div
            key="success"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
            <Check className={cn('text-primary', isSmall ? 'size-3.5' : 'size-4')} />
          </motion.div>
        ) : isFollowing ? (
          <motion.div
            key="following"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
            <UserMinus className={isSmall ? 'size-3.5' : 'size-4'} />
          </motion.div>
        ) : (
          <motion.div
            key="follow"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
            <UserPlus className={isSmall ? 'size-3.5' : 'size-4'} />
          </motion.div>
        )}
      </AnimatePresence>
      <span>{isFollowing ? 'フォロー中' : 'フォロー'}</span>
    </motion.button>
  )
}
