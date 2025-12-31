'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'
import { cn } from '@/lib/utils'
import { useNotificationPrompt } from '../hooks/use-notification-prompt'

/**
 * 初回通知許可プロンプトバナー
 *
 * 初回ログイン後に表示され、通知許可を促す。
 * InstallBannerと同様のUIパターンを使用。
 */
export function NotificationPromptBanner() {
  const { shouldShowPrompt, isLoading, handleAllow, handleDismiss, error } =
    useNotificationPrompt()

  return (
    <AnimatePresence>
      {shouldShowPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed bottom-20 left-4 right-4 z-50',
            'bg-background/95 backdrop-blur-sm border border-border',
            'rounded-2xl shadow-lg p-4',
            'safe-area-inset-bottom'
          )}
        >
          <div className="flex items-center gap-3">
            {/* アイコン */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                通知を受け取りますか？
              </p>
              <p className="text-sm text-muted-foreground truncate">
                忙しくても、書くきっかけを作ります
              </p>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="閉じる"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {/* サブテキスト */}
          <p className="mt-2 text-xs text-muted-foreground">
            マイページからいつでも設定できます
          </p>

          {/* アクションボタン */}
          <div className="flex gap-2 mt-3">
            <MotionButton
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex-1"
              disabled={isLoading}
            >
              後で
            </MotionButton>
            <MotionButton
              variant="sage"
              size="sm"
              onClick={handleAllow}
              className="flex-1"
              disabled={isLoading}
            >
              <Bell className="w-4 h-4" />
              {isLoading ? '設定中...' : '許可する'}
            </MotionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
