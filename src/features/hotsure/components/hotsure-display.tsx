'use client'

import { motion } from 'framer-motion'
import { Info, Spool } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface HotsureDisplayProps {
  remaining: number
  max: number
}

// 次の月曜日までの日数を計算
function getDaysUntilNextMonday(): number {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=日, 1=月, ..., 6=土
  // 月曜日(1)までの日数を計算
  // 月曜日の場合は7日後（次の月曜日）
  const daysUntil = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7
  return daysUntil === 0 ? 7 : daysUntil
}

// 残り0の場合の警告アニメーション
const warningShakeVariants = {
  animate: {
    x: [0, -2, 2, -2, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
}

// 残り1の場合の軽い振動
const cautionPulseVariants = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

// プログレスドットのアニメーション
const dotVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 400,
      damping: 15,
    },
  }),
}

export function HotsureDisplay({
  remaining,
  max,
}: HotsureDisplayProps) {
  const daysUntilRefill = getDaysUntilNextMonday()
  // ステータスに応じたスタイル
  const getStatusStyle = () => {
    if (remaining === 0) {
      return {
        container: 'bg-danger-300/20 border-2 border-danger-300 dark:bg-danger-400/10 dark:border-danger-400',
        text: 'text-danger-400 dark:text-danger-300',
        dotFilled: 'bg-danger-400 dark:bg-danger-300',
        dotEmpty: 'bg-danger-300/30 dark:bg-danger-400/20',
        icon: <span className="text-2xl">⚠️</span>,
        message: 'ほつれ切れ！記録を忘れずに',
      }
    }
    if (remaining === 1) {
      return {
        container: 'bg-warning-300/20 border-2 border-warning-300 dark:bg-warning-400/10 dark:border-warning-400',
        text: 'text-warning-400 dark:text-warning-300',
        dotFilled: 'bg-warning-400 dark:bg-warning-300',
        dotEmpty: 'bg-warning-300/30 dark:bg-warning-400/20',
        icon: <span className="text-2xl">⚡</span>,
        message: '残りわずか！計画的に',
      }
    }
    return {
      container: 'bg-primary-100/50 dark:bg-primary-200/20',
      text: 'text-primary-500 dark:text-primary-400',
      dotFilled: 'bg-primary-400 dark:bg-primary-300',
      dotEmpty: 'bg-primary-200 dark:bg-primary-300/30',
      icon: null,
      message: '安心のセーフティネット',
    }
  }

  const style = getStatusStyle()

  // アニメーションバリアントの選択
  const containerVariants =
    remaining === 0 ? warningShakeVariants : remaining === 1 ? cautionPulseVariants : undefined

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">ほつれ</CardTitle>
      </CardHeader>
      <CardContent>
        {/* メイン表示エリア */}
        <motion.div
          className={cn('p-5 rounded-xl', style.container)}
          variants={containerVariants}
          animate={containerVariants ? 'animate' : undefined}
        >
          {/* ステータスアイコンとメッセージ */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {style.icon}
              <span className={cn('text-sm font-medium', style.text)}>{style.message}</span>
            </div>
            <span className={cn('text-lg font-bold tabular-nums', style.text)}>
              {remaining}/{max}
            </span>
          </div>

          {/* プログレスバー（アイコン形式） */}
          <div className="flex items-center justify-center gap-4">
            {Array.from({ length: max }).map((_, index) => {
              const isFilled = index < remaining

              return (
                <motion.div
                  key={index}
                  custom={index}
                  variants={dotVariants}
                  initial="initial"
                  animate="animate"
                  className="flex flex-col items-center"
                >
                  <Spool
                    className={cn(
                      'w-10 h-10 transition-colors rotate-[15deg]',
                      isFilled ? style.text : 'text-muted-foreground/30'
                    )}
                  />
                </motion.div>
              )
            })}
          </div>

        </motion.div>

        {/* 補充情報 */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>次の補充まで</span>
          <span className="font-medium text-primary-500">{daysUntilRefill}日</span>
        </div>

        {/* 説明パネル */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              ほつれは毎週月曜日に2回まで自動補充されます。
              記録がない日は自動的に1回消費され、継続記録を守ります。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
