'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Loader2 } from 'lucide-react'
import { useCelebration } from '../hooks/use-celebration'
import { ANIMATION_CONFIG } from '../constants'
import { cn } from '@/lib/utils'

interface CelebrateButtonProps {
  achievementId: string
  initialIsCelebrated: boolean
  celebrationCount: number
  onToggle?: (isCelebrated: boolean) => void
}

// パーティクルの設定
const PARTICLE_COUNT = 8
const generateParticles = () =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i + Math.random() * 20 - 10,
  }))

// ボタンアニメーション
const buttonVariants = {
  idle: { scale: 1 },
  tap: { scale: 0.95 },
  celebrate: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
}

// パーティクルアニメーション
const particleVariants = {
  initial: { scale: 0, opacity: 1 },
  animate: (angle: number) => ({
    scale: [0, 1.2, 0],
    opacity: [1, 1, 0],
    x: Math.cos((angle * Math.PI) / 180) * 24,
    y: Math.sin((angle * Math.PI) / 180) * 24,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  }),
}

/**
 * お祝いボタン
 * 達成へのリアクション機能
 * パーティクルエフェクト付き
 */
export function CelebrateButton({
  achievementId,
  initialIsCelebrated,
  celebrationCount,
  onToggle,
}: CelebrateButtonProps) {
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<{ id: number; angle: number }[]>([])

  // 成功時のコールバック（パーティクルエフェクト）
  const handleSuccess = useCallback(
    (newState: boolean) => {
      onToggle?.(newState)
      if (newState) {
        // パーティクルエフェクトを表示
        setParticles(generateParticles())
        setShowParticles(true)
        setTimeout(() => setShowParticles(false), 600)
      }
    },
    [onToggle]
  )

  const { isCelebrated, count, isPending, toggle } = useCelebration({
    achievementId,
    initialIsCelebrated,
    initialCount: celebrationCount,
    onSuccess: handleSuccess,
  })

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isCelebrated}
        aria-label={isCelebrated ? 'お祝いを取り消す' : 'お祝いする'}
        aria-busy={isPending}
        variants={buttonVariants}
        initial="idle"
        whileTap="tap"
        animate={showParticles ? 'celebrate' : 'idle'}
        transition={ANIMATION_CONFIG.springSnappy}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium',
          'transition-colors disabled:pointer-events-none disabled:opacity-50',
          'hover:bg-accent/50 dark:hover:bg-accent/30',
          isCelebrated
            ? 'text-accent-400 hover:text-accent-500'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PartyPopper
            className={cn('size-4 transition-transform', isCelebrated && 'fill-current')}
          />
        )}
        <span>{count > 0 ? count : 'お祝い'}</span>
      </motion.button>

      {/* パーティクルエフェクト */}
      <AnimatePresence>
        {showParticles && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                custom={particle.angle}
                variants={particleVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0 }}
                className="absolute size-2 rounded-full bg-accent-400"
                style={{ originX: 0.5, originY: 0.5 }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
