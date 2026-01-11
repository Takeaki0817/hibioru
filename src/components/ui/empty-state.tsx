'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** アイコン（Lucide Icons） */
  icon: LucideIcon
  /** タイトル */
  title: string
  /** 説明文 */
  description: string
  /** 追加のクラス名 */
  className?: string
}

/**
 * 空状態表示コンポーネント
 * リストが空の場合に表示する共通化されたUI
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center py-12', className)}
    >
      <div className="size-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <Icon className="size-8 text-primary-400" aria-hidden="true" />
      </div>
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {description}
      </p>
    </motion.div>
  )
}
