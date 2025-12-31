'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/animations'
import { Logo } from '@/components/brand/logo'

interface EntryHeaderProps {
  title?: string
  onClose?: () => void
}

export function EntryHeader({ title, onClose }: EntryHeaderProps) {
  const router = useRouter()

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      router.push('/timeline')
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-400 items-center justify-between px-2.5 md:px-4">
        {/* 左: ロゴ */}
        <h1 className="text-foreground">
          <Logo size="sm" />
          <span className="sr-only">ヒビオル</span>
        </h1>

        {/* 中央: タイトル（オプション） */}
        {title && (
          <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground">
            {title}
          </span>
        )}

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
