'use client'

/**
 * 成功オーバーレイコンポーネント
 *
 * 投稿成功時のチェックマークアニメーションと達成演出を統合。
 * 複数達成時は最高レベルのエフェクトを採用。
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { NewAchievementInfo } from '../types'
import { AchievementParticleEffect } from './achievement-particle-effect'
import { useVibration } from '../hooks/use-vibration'
import { getAchievementMessage } from '@/features/social/constants'
import type { AchievementLevel } from '@/features/social/utils/achievement-level'

// 成功アニメーション
const successVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
  exit: { scale: 0, opacity: 0 },
}

// チェックマークのパスアニメーション
const checkmarkVariants = {
  initial: { pathLength: 0 },
  animate: {
    pathLength: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

interface SuccessOverlayProps {
  message?: string
  achievements?: NewAchievementInfo[] | null
  onComplete?: () => void
}

/**
 * 成功時のチェックマークアニメーションオーバーレイ
 *
 * 達成があれば、チェックマーク完了後にパーティクルエフェクトとバイブレーションを発生させる。
 */
export function SuccessOverlay({
  message = '記録しました！',
  achievements,
  onComplete,
}: SuccessOverlayProps) {
  const [showParticles, setShowParticles] = useState(false)
  const { vibrate } = useVibration()

  // 最高レベルの達成を取得（Requirements 4.2）
  const highestAchievement = useMemo(() => {
    if (!achievements || achievements.length === 0) return null

    return achievements.reduce((highest, current) =>
      current.level > highest.level ? current : highest
    )
  }, [achievements])

  // 達成レベル
  const achievementLevel: AchievementLevel | null = highestAchievement?.level ?? null

  // 達成メッセージ（Requirements 4.4）
  const achievementMessage = useMemo(() => {
    if (!highestAchievement) return null
    return getAchievementMessage(highestAchievement.type, highestAchievement.threshold)
  }, [highestAchievement])

  // チェックマーク完了後にパーティクル開始（Requirements 4.1）
  useEffect(() => {
    if (!achievementLevel) return

    // チェックマークアニメーション完了（400ms）後にパーティクル開始
    const timer = setTimeout(() => {
      setShowParticles(true)
      // バイブレーションフィードバック
      vibrate(achievementLevel)
    }, 400)

    return () => clearTimeout(timer)
  }, [achievementLevel, vibrate])

  // パーティクル完了コールバック（Requirements 4.5: エフェクト完了後に閉じる）
  const handleParticleComplete = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  // 達成なしの場合、チェックマーク完了後に呼び出し
  useEffect(() => {
    if (achievementLevel !== null) return

    // チェックマーク完了後に少し待ってからonComplete
    const timer = setTimeout(() => {
      onComplete?.()
    }, 500)

    return () => clearTimeout(timer)
  }, [achievementLevel, onComplete])

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-xl overflow-hidden"
      variants={successVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* スクリーンリーダー向け通知（Requirements 5.4） */}
      <span className="sr-only">
        記録が完了しました
        {achievementMessage && `。${achievementMessage}`}
      </span>

      <div className="relative flex flex-col items-center gap-3">
        {/* チェックマークサークル */}
        <motion.div className="relative w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center">
          <motion.svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              variants={checkmarkVariants}
              initial="initial"
              animate="animate"
            />
          </motion.svg>

          {/* パーティクルエフェクト（Requirements 4.1, 4.5） */}
          {showParticles && achievementLevel && (
            <AchievementParticleEffect
              level={achievementLevel}
              onComplete={handleParticleComplete}
            />
          )}
        </motion.div>

        {/* メッセージ */}
        <motion.p
          className="text-primary-500 font-medium text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>

        {/* 達成メッセージ（Requirements 4.4） */}
        {achievementMessage && (
          <motion.p
            className="text-accent-500 font-bold text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
          >
            {achievementMessage}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
