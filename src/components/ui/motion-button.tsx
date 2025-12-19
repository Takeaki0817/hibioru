'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * MotionButton - Framer Motionを使用したアニメーション付きボタン
 * ADHDユーザー向けの心地よいフィードバックを提供
 */

const motionButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-focus aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        // ヒビオル専用: アクセントボタン（達成・報酬用）
        accent:
          'bg-accent-400 text-white hover:bg-accent-500 dark:bg-accent-400 dark:hover:bg-accent-500',
        // ヒビオル専用: プライマリグリーン
        sage: 'bg-primary-400 text-white hover:bg-primary-500 dark:bg-primary-400 dark:hover:bg-primary-500',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        xl: 'h-12 rounded-lg px-8 text-base has-[>svg]:px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// スプリングアニメーション設定
const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
}

// タップアニメーション設定
const tapAnimation = {
  scale: 0.97,
}

// ホバーアニメーション設定
const hoverAnimation = {
  scale: 1.02,
}

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'> &
  VariantProps<typeof motionButtonVariants> & {
    asChild?: boolean
    // アニメーション無効化オプション（reduced-motion対応）
    disableAnimation?: boolean
  }

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      disableAnimation = false,
      ...props
    },
    ref
  ) => {
    // asChildの場合は通常のボタンとして動作
    if (asChild) {
      return (
        <Slot
          data-slot="button"
          data-variant={variant}
          data-size={size}
          className={cn(motionButtonVariants({ variant, size, className }))}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        />
      )
    }

    // アニメーション無効時
    if (disableAnimation) {
      return (
        <button
          ref={ref}
          data-slot="button"
          data-variant={variant}
          data-size={size}
          className={cn(motionButtonVariants({ variant, size, className }))}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        />
      )
    }

    return (
      <motion.button
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(motionButtonVariants({ variant, size, className }))}
        whileTap={tapAnimation}
        whileHover={hoverAnimation}
        transition={springTransition}
        {...props}
      />
    )
  }
)
MotionButton.displayName = 'MotionButton'

export { MotionButton, motionButtonVariants }
