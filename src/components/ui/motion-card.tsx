'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'

/**
 * MotionCard - Framer Motionを使用したアニメーション付きカード
 * ADHDユーザー向けの心地よいフィードバックを提供
 */

// CVAバリアント定義
const motionCardVariants = cva(
  'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
  {
    variants: {
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
      accentColor: {
        none: '',
        primary: 'border-l-4 border-l-primary-400',
        accent: 'border-l-4 border-l-accent-300',
        reward: 'border-l-4 border-l-reward-400',
        warning: 'border-l-4 border-l-warning-400',
        danger: 'border-l-4 border-l-danger-400',
      },
    },
    defaultVariants: {
      interactive: false,
      accentColor: 'none',
    },
  }
)

// ホバーアニメーション設定（軽いリフトアップ）
const hoverAnimation = {
  y: -2,
  boxShadow: '0 8px 30px -12px rgba(0, 0, 0, 0.15)',
}

// タップアニメーション設定
const tapAnimation = {
  scale: 0.99,
  y: 0,
}

type MotionCardProps = Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> &
  Omit<VariantProps<typeof motionCardVariants>, 'accentColor'> & {
    // アニメーション無効化オプション（reduced-motion対応）
    disableAnimation?: boolean
    // 左ボーダーアクセント（エントリカード用）
    accentBorder?: boolean
    // アクセントカラー
    accentColor?: 'primary' | 'accent' | 'reward' | 'warning' | 'danger'
    // children
    children?: React.ReactNode
  }

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      className,
      interactive = false,
      disableAnimation = false,
      accentBorder = false,
      accentColor = 'primary',
      children,
      ...props
    },
    ref
  ) => {
    // accentBorderがfalseの場合はnone、trueの場合は指定されたaccentColorを使用
    const resolvedAccentColor = accentBorder ? accentColor : 'none'

    const baseClassName = cn(
      motionCardVariants({
        interactive,
        accentColor: resolvedAccentColor,
      }),
      className
    )

    // アニメーション無効またはインタラクティブでない場合
    if (disableAnimation || !interactive) {
      return (
        <div ref={ref} data-slot="card" className={baseClassName} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        data-slot="card"
        className={baseClassName}
        whileHover={hoverAnimation}
        whileTap={tapAnimation}
        transition={springs.subtle}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
MotionCard.displayName = 'MotionCard'

// CardHeader, CardContent等は既存のものを再利用
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  MotionCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
