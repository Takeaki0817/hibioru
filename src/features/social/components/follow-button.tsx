'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, UserPlus, UserMinus, Check } from 'lucide-react'
import { useFollow } from '../hooks/use-follow'
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
  const [showSuccess, setShowSuccess] = useState(false)

  // 成功時のコールバック（成功アニメーション）
  const handleSuccess = useCallback((newIsFollowing: boolean) => {
    if (newIsFollowing) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1000)
    }
  }, [])

  const { isFollowing, isPending, isLoading, toggle } = useFollow({
    userId,
    initialIsFollowing,
    onSuccess: handleSuccess,
  })

  const isSmall = size === 'sm'

  // ローディング中
  if (isLoading || isFollowing === null) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-md border border-border bg-background',
          isSmall ? 'h-7 px-2' : 'h-8 px-3'
        )}
      >
        <Loader2
          className={cn('animate-spin text-muted-foreground', isSmall ? 'size-3.5' : 'size-4')}
        />
      </div>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
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
