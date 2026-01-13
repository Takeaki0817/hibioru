'use client'

import { motion } from 'framer-motion'
import { flameVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface FlameAnimationFallbackProps {
  /** 追加のクラス名 */
  className?: string
}

/**
 * Riveアニメーションが使用できない場合のフォールバック
 * - prefers-reduced-motion が有効な場合
 * - Rive のロード中/エラー時
 */
export function FlameAnimationFallback({ className }: FlameAnimationFallbackProps) {
  return (
    <motion.span
      className={cn('text-5xl block', className)}
      variants={flameVariants}
      animate="animate"
      aria-hidden="true"
    >
      🔥
    </motion.span>
  )
}
