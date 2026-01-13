'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/animations'
import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { usePlanLimits } from '@/features/billing/hooks/use-plan-limits'
import { isPremiumPlan } from '@/features/billing/constants'

interface EntryHeaderProps {
  /** 編集画面などで表示するタイトル（指定時は制限表示を非表示） */
  title?: string
  onClose?: () => void
}

export function EntryHeader({ title, onClose }: EntryHeaderProps) {
  const router = useRouter()
  const { entryLimit, imageLimit, planType, isLoading } = usePlanLimits()

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      router.push('/timeline')
    }
  }

  const isPremium = isPremiumPlan(planType)

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-400 items-center justify-between px-2.5 md:px-4">
        {/* 左: ロゴ */}
        <h1 className="text-foreground">
          <Logo className="w-24 h-auto" />
          <span className="sr-only">ヒビオル</span>
        </h1>

        {/* 中央: タイトルまたは制限表示 */}
        <div className="absolute left-1/2 -translate-x-1/2">
          {title ? (
            // タイトルが指定されている場合（編集画面など）
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
          ) : (
            // タイトルがない場合は制限表示（新規投稿画面）
            !isLoading && (
              <>
                {isPremium ? (
                  <Badge variant="default" className="gap-1">
                    <Crown className="w-3 h-3" />
                    プレミアム
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {entryLimit && entryLimit.limit !== null && (
                      <span>
                        投稿: {entryLimit.remaining}/{entryLimit.limit}
                      </span>
                    )}
                    {imageLimit && imageLimit.limit !== null && (
                      <span>
                        画像: {imageLimit.remaining}/{imageLimit.limit}/月
                      </span>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>

        {/* 右: 閉じるボタン */}
        <motion.button
          variants={buttonVariants}
          whileTap="tap"
          whileHover="hover"
          onClick={handleClose}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2'
          )}
          aria-label="閉じる"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
    </header>
  )
}
