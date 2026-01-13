'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cva } from 'class-variance-authority'
import dynamic from 'next/dynamic'
import { FeatureCard } from '@/components/ui/feature-card'
import { numberHighlightVariants, recordHighlightVariants } from '@/lib/animations'
import { WeeklyRecordDots } from './weekly-record-dots'
import { LongestStreakCard } from './longest-streak-card'
import { FlameAnimationFallback } from './flame-animation-fallback'
import { useFlameIntensity } from '../hooks/use-flame-intensity'
import { useReducedMotion } from '../hooks/use-reduced-motion'

// Riveアニメーションは動的インポート（SSR無効化）
const FlameAnimation = dynamic(
  () => import('./flame-animation').then((mod) => mod.FlameAnimation),
  {
    ssr: false,
    loading: () => <FlameAnimationFallback />,
  }
)

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  // 過去7日間の記録状態（true=記録あり、false=記録なし）
  weeklyRecords?: boolean[]
  // 過去7日間のほつれ使用状態（true=ほつれ使用、false=未使用）
  hotsureRecords?: boolean[]
}

// CVAバリアント定義 - メインストリーク表示
const streakContainerVariants = cva('relative p-5 rounded-xl overflow-hidden', {
  variants: {
    isNewRecord: {
      true: 'bg-gradient-to-br from-accent-50 to-reward-300/20 border-2 border-accent-300 dark:from-accent-100 dark:to-reward-400/20 dark:border-accent-400',
      false: 'bg-gradient-to-br from-accent-50 to-primary-50 dark:from-accent-100 dark:to-primary-100',
    },
  },
  defaultVariants: {
    isNewRecord: false,
  },
})

export function StreakDisplay({
  currentStreak,
  longestStreak,
  weeklyRecords = [true, true, true, true, true, false, false],
  hotsureRecords,
}: StreakDisplayProps) {
  // 現在のストリークが最長記録と一致するかチェック
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0

  // 新記録まであと何日か
  const daysToNewRecord = longestStreak - currentStreak + 1

  // 今日の曜日（0=月曜日）
  const todayIndex = (new Date().getDay() + 6) % 7

  // Riveアニメーション用の強度計算
  const { scale, shouldExplode } = useFlameIntensity(currentStreak, longestStreak)

  // アクセシビリティ: 視覚効果を減らす設定
  const prefersReducedMotion = useReducedMotion()

  return (
    <FeatureCard title="継続記録">
      {/* ストリーク0日の場合の励ましメッセージ */}
      {currentStreak === 0 ? (
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className="text-5xl block mb-3" aria-hidden="true">
              🌱
            </span>
            <p className="text-muted-foreground mb-1">まだ何も書いてないよ</p>
            <p className="text-sm text-primary-500 font-medium">今日から始めてみよう！</p>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* メインのストリーク表示 */}
          <div className={streakContainerVariants({ isNewRecord })}>
            {/* 新記録時のハイライト背景 */}
            {isNewRecord && (
              <motion.div
                className="absolute inset-0 bg-reward-400/20"
                variants={recordHighlightVariants}
                initial="initial"
                animate="animate"
              />
            )}

            <div className="relative flex items-center justify-center flex-col">
              {/* 炎アニメーション */}
              <div className="w-32 h-32">
                {prefersReducedMotion ? (
                  <FlameAnimationFallback />
                ) : (
                  <FlameAnimation
                    scale={scale}
                    triggerExplosion={shouldExplode}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* ストリーク数字 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStreak}
                  variants={numberHighlightVariants}
                  initial="initial"
                  animate="animate"
                  className="text-center"
                >
                  <span className="text-5xl font-bold text-accent-500 dark:text-accent-400 tabular-nums tracking-tight">
                    {currentStreak}
                  </span>
                  <span className="text-lg text-accent-500/80 dark:text-accent-400/80 ml-1">
                    日連続
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* 新記録バッジ */}
              {isNewRecord && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mt-3 flex items-center gap-1 px-3 py-1 bg-reward-400 text-white rounded-full text-sm font-medium"
                >
                  <span aria-hidden="true">🎉</span>
                  <span>最高記録更新中！</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* 週間ビュー */}
          <WeeklyRecordDots
            weeklyRecords={weeklyRecords}
            hotsureRecords={hotsureRecords}
            todayIndex={todayIndex}
          />

          {/* 最長記録 */}
          <LongestStreakCard
            longestStreak={longestStreak}
            daysToNewRecord={daysToNewRecord}
            isNewRecord={isNewRecord}
            currentStreak={currentStreak}
          />
        </div>
      )}
    </FeatureCard>
  )
}
