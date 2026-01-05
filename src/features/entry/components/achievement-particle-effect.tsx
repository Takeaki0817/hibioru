'use client'

/**
 * 達成パーティクルエフェクトコンポーネント
 *
 * 達成レベルに応じたパーティクルアニメーションを表示。
 * GPUアクセラレーションを使用して60FPSで滑らかに動作。
 * prefers-reduced-motion設定が有効な場合はアニメーションを無効化。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.5
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { AchievementLevel } from '@/features/social/utils/achievement-level'
import {
  PARTICLE_CONFIGS,
  PARTICLE_ANIMATION,
  getTotalDuration,
  generateParticlesForWave,
  type Particle,
} from '../constants/particle-config'
import { cn } from '@/lib/utils'

interface AchievementParticleEffectProps {
  level: AchievementLevel
  onComplete?: () => void
}

// パーティクルアニメーションのvariants
const particleVariants = {
  initial: { scale: 0, opacity: 1, x: 0, y: 0 },
  animate: (custom: { angle: number; distance: number; delay: number }) => ({
    scale: [0, 1.2, 0],
    opacity: [1, 1, 0],
    x: Math.cos((custom.angle * Math.PI) / 180) * custom.distance,
    y: Math.sin((custom.angle * Math.PI) / 180) * custom.distance,
    transition: {
      duration: PARTICLE_ANIMATION.DURATION / 1000, // 秒に変換
      ease: 'easeOut' as const,
      delay: custom.delay,
    },
  }),
}

/**
 * 達成パーティクルエフェクトコンポーネント
 */
export function AchievementParticleEffect({
  level,
  onComplete,
}: AchievementParticleEffectProps) {
  const shouldReduceMotion = useReducedMotion()
  const [allParticles, setAllParticles] = useState<Particle[]>([])

  const config = useMemo(() => PARTICLE_CONFIGS[level], [level])
  const totalDuration = useMemo(() => getTotalDuration(level), [level])

  // reduced-motion時は即座に完了
  useEffect(() => {
    if (shouldReduceMotion) {
      onComplete?.()
      return
    }
  }, [shouldReduceMotion, onComplete])

  // 波の開始を管理
  useEffect(() => {
    if (shouldReduceMotion) return

    // 最初の波を即座に開始
    setAllParticles(generateParticlesForWave(config.count, 0))

    // 追加の波をスケジュール
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < config.waves; i++) {
      const timer = setTimeout(() => {
        setAllParticles((prev) => [...prev, ...generateParticlesForWave(config.count, i)])
      }, i * config.waveInterval)
      timers.push(timer)
    }

    // 完了コールバック
    const completeTimer = setTimeout(() => {
      onComplete?.()
    }, totalDuration)
    timers.push(completeTimer)

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [config, totalDuration, onComplete, shouldReduceMotion])

  // reduced-motion時は何も表示しない
  if (shouldReduceMotion) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      <AnimatePresence>
        {allParticles.map((particle) => (
          <motion.div
            key={particle.id}
            custom={{
              angle: particle.angle,
              distance: particle.distance,
              delay: particle.delay,
            }}
            variants={particleVariants}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0 }}
            className={cn(
              'absolute rounded-full',
              particle.color,
              particle.size
            )}
            style={{
              // GPUアクセラレーション
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
