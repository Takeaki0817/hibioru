'use client'

import { motion } from 'framer-motion'
import { Info, Spool } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  warningShakeVariants,
  cautionPulseVariants,
} from '@/lib/animations'

interface HotsureDisplayProps {
  remaining: number
  max: number
}

// CVAバリアント定義 - コンテナ
const hotsureContainerVariants = cva('p-5 rounded-xl', {
  variants: {
    status: {
      empty: 'bg-danger-300/20 border-2 border-danger-300 dark:bg-danger-400/10 dark:border-danger-400',
      warning: 'bg-warning-300/20 border-2 border-warning-300 dark:bg-warning-400/10 dark:border-warning-400',
      safe: 'bg-primary-100/50 dark:bg-primary-200/20',
    },
  },
  defaultVariants: {
    status: 'safe',
  },
})

// CVAバリアント定義 - テキスト
const hotsureTextVariants = cva('', {
  variants: {
    status: {
      empty: 'text-danger-400 dark:text-danger-300',
      warning: 'text-warning-400 dark:text-warning-300',
      safe: 'text-primary-500 dark:text-primary-400',
    },
  },
  defaultVariants: {
    status: 'safe',
  },
})

// 次の月曜日までの日数を計算
function getDaysUntilNextMonday(): number {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=日, 1=月, ..., 6=土
  // 月曜日(1)までの日数を計算
  // 月曜日の場合は7日後（次の月曜日）
  const daysUntil = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7
  return daysUntil === 0 ? 7 : daysUntil
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

// ステータスを決定するヘルパー関数
function getStatus(remaining: number): 'empty' | 'warning' | 'safe' {
  if (remaining === 0) return 'empty'
  if (remaining === 1) return 'warning'
  return 'safe'
}

export function HotsureDisplay({
  remaining,
  max,
}: HotsureDisplayProps) {
  const daysUntilRefill = getDaysUntilNextMonday()
  const status = getStatus(remaining)

  // ステータスに応じた追加情報
  const statusInfo = {
    empty: { icon: <span className="text-2xl">⚠️</span>, message: 'ほつれ切れ！記録を忘れずに' },
    warning: { icon: <span className="text-2xl">⚡</span>, message: '残りわずか！計画的に' },
    safe: { icon: null, message: '安心のセーフティネット' },
  }[status]

  // アニメーションバリアントの選択
  const containerAnimVariants =
    status === 'empty' ? warningShakeVariants : status === 'warning' ? cautionPulseVariants : undefined

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">ほつれ</CardTitle>
      </CardHeader>
      <CardContent>
        {/* メイン表示エリア */}
        <motion.div
          className={hotsureContainerVariants({ status })}
          variants={containerAnimVariants}
          animate={containerAnimVariants ? 'animate' : undefined}
        >
          {/* ステータスアイコンとメッセージ */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {statusInfo.icon}
              <span className={cn('text-sm font-medium', hotsureTextVariants({ status }))}>
                {statusInfo.message}
              </span>
            </div>
            <span className={cn('text-lg font-bold tabular-nums', hotsureTextVariants({ status }))}>
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
                    aria-hidden="true"
                    className={cn(
                      'w-10 h-10 transition-colors rotate-[15deg]',
                      isFilled ? hotsureTextVariants({ status }) : 'text-muted-foreground/30'
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
          <span className="font-medium text-primary-500" data-testid="refill-days">{daysUntilRefill}日</span>
        </div>

        {/* 説明パネル */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
            <Info aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
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
