'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cva } from 'class-variance-authority'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { flameVariants } from '@/lib/animations'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  // 過去7日間の記録状態（true=記録あり、false=記録なし）
  weeklyRecords?: boolean[]
}

// 曜日ラベル
const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

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

// 数字のアニメーション
const numberVariants = {
  initial: { scale: 1.1, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 20 },
  },
}

// 新記録時のハイライトアニメーション
const highlightVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.3, 0],
    transition: { duration: 1.5, repeat: Infinity },
  },
}

// 週間ドットのアニメーション
const dotVariants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
}

// 今日のドットのパルスアニメーション（ローカル定義を維持）
const localTodayPulseVariants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  weeklyRecords = [true, true, true, true, true, false, false], // デフォルトでサンプルデータ
}: StreakDisplayProps) {
  // 現在のストリークが最長記録と一致するかチェック
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0

  // 新記録まであと何日か
  const daysToNewRecord = longestStreak - currentStreak + 1

  // 今日の曜日（0=月曜日）
  const todayIndex = (new Date().getDay() + 6) % 7

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>継続記録</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* ストリーク0日の場合の励ましメッセージ */}
        {currentStreak === 0 ? (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="text-5xl block mb-3" aria-hidden="true">🌱</span>
              <p className="text-muted-foreground mb-1">まだ記録がありません</p>
              <p className="text-sm text-primary-500 font-medium">今日から始めましょう！</p>
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
                  variants={highlightVariants}
                  initial="initial"
                  animate="animate"
                />
              )}

              <div className="relative flex items-center justify-center flex-col">
                {/* 炎アイコン */}
                <motion.span
                  className="text-5xl mb-2"
                  variants={flameVariants}
                  animate="animate"
                  aria-hidden="true"
                >
                  🔥
                </motion.span>

                {/* ストリーク数字 */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStreak}
                    variants={numberVariants}
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
            <div className="px-2">
              <p className="text-xs text-muted-foreground mb-2 text-center">今週の記録</p>
              <div className="flex justify-between items-center">
                {WEEKDAY_LABELS.map((label, index) => {
                  const hasRecord = weeklyRecords[index]
                  const isToday = index === todayIndex
                  const isFuture = index > todayIndex

                  // アクセシビリティ用のラベルを生成
                  const statusLabel = isFuture
                    ? '未来'
                    : hasRecord
                      ? '記録あり'
                      : '記録なし'

                  return (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1"
                      aria-label={`${label}曜日：${isToday ? '今日、' : ''}${statusLabel}`}
                    >
                      <motion.div
                        variants={isToday ? localTodayPulseVariants : dotVariants}
                        initial="initial"
                        animate="animate"
                        aria-hidden="true"
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                          isFuture
                            ? 'bg-muted text-muted-foreground/50'
                            : hasRecord
                              ? 'bg-accent-300 text-white dark:bg-accent-400'
                              : 'bg-muted text-muted-foreground',
                          isToday && 'ring-2 ring-primary-400 ring-offset-2'
                        )}
                      >
                        {hasRecord && !isFuture ? '✓' : ''}
                      </motion.div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'text-xs',
                          isToday ? 'text-primary-500 font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 最長記録 */}
            <div className="p-4 rounded-xl bg-reward-300/20 dark:bg-reward-400/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">🏆</span>
                  <div>
                    <p className="text-xs text-muted-foreground">過去最長記録</p>
                    <p className="text-xl font-bold text-reward-500 dark:text-reward-400 tabular-nums">
                      {longestStreak}日
                    </p>
                  </div>
                </div>
                {!isNewRecord && currentStreak > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">新記録まで</p>
                    <p className="text-sm font-medium text-primary-500">あと{daysToNewRecord}日</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
