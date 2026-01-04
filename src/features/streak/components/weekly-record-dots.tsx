'use client'

import { motion } from 'framer-motion'
import { Spool } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dotAnimationVariants, todayDotPulseVariants } from '@/lib/animations'

// 曜日ラベル
const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

interface WeeklyRecordDotsProps {
  weeklyRecords: boolean[]
  hotsureRecords?: boolean[]
  todayIndex: number
}

/**
 * 週間記録のドット表示コンポーネント
 */
export function WeeklyRecordDots({
  weeklyRecords,
  hotsureRecords,
  todayIndex,
}: WeeklyRecordDotsProps) {
  return (
    <div className="px-2">
      <p className="text-xs text-muted-foreground mb-2 text-center">今週の記録</p>
      <div className="flex justify-between items-center">
        {WEEKDAY_LABELS.map((label, index) => {
          const hasRecord = weeklyRecords[index]
          const hasHotsure = hotsureRecords?.[index] ?? false
          const isToday = index === todayIndex
          const isFuture = index > todayIndex

          // アクセシビリティ用のラベルを生成
          const statusLabel = isFuture
            ? '未来'
            : hasHotsure
              ? 'ほつれ使用'
              : hasRecord
                ? '記録あり'
                : '記録なし'

          return (
            <div
              key={label}
              className="relative flex flex-col items-center gap-1"
              aria-label={`${label}曜日：${isToday ? '今日、' : ''}${statusLabel}`}
            >
              {/* ほつれアイコン */}
              {hasHotsure && (
                <Spool className="absolute -right-1 -top-1 h-3 w-3 text-primary-400 z-10" />
              )}
              <motion.div
                variants={isToday ? todayDotPulseVariants : dotAnimationVariants}
                initial="initial"
                animate="animate"
                aria-hidden="true"
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                  isFuture
                    ? 'bg-muted text-muted-foreground/50'
                    : hasHotsure
                      ? 'bg-primary-200 text-primary-600 dark:bg-primary-300 dark:text-primary-700'
                      : hasRecord
                        ? 'bg-accent-300 text-white dark:bg-accent-400'
                        : 'bg-muted text-muted-foreground',
                  isToday && 'ring-2 ring-primary-400 ring-offset-2'
                )}
              >
                {hasHotsure ? '~' : hasRecord && !isFuture ? '✓' : ''}
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
  )
}
