'use client'

import { useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, Plus } from 'lucide-react'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { MotionButton } from '@/components/ui/motion-button'
import { cn } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/constants/app-config'

// ハイドレーション対応: クライアント側でのみtrueを返す
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * PWAインストールバナー
 *
 * Android/Chrome: インストールボタンを表示
 * iOS: ホーム画面に追加の手順を案内
 */
export function InstallBanner() {
  const { shouldShowBanner, canInstall, isIOS, install, dismiss } = usePwaInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  // ハイドレーション不整合を防ぐため、マウント後にのみ表示
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  // サーバー/ハイドレーション中またはバナー非表示条件では何もレンダリングしない
  if (!isClient || !shouldShowBanner) {
    return null
  }

  // インストール実行
  const handleInstall = async () => {
    const success = await install()
    if (success) {
      // インストール成功
    }
  }

  // iOS案内モーダルを開く
  const handleIOSGuide = () => {
    setShowIOSGuide(true)
  }

  return (
    <>
      {/* インストールバナー */}
      <AnimatePresence>
        {shouldShowBanner && (
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
              {/* アプリアイコン */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <Download className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {APP_CONFIG.shortName}をインストール
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  ホーム画面に追加してすぐにアクセス
                </p>
              </div>

              {/* 閉じるボタン */}
              <button
                onClick={dismiss}
                className="flex-shrink-0 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 mt-3">
              <MotionButton
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="flex-1"
              >
                後で
              </MotionButton>
              {canInstall ? (
                <MotionButton
                  variant="sage"
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                >
                  <Download className="w-4 h-4" />
                  インストール
                </MotionButton>
              ) : isIOS ? (
                <MotionButton
                  variant="sage"
                  size="sm"
                  onClick={handleIOSGuide}
                  className="flex-1"
                >
                  追加方法を見る
                </MotionButton>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS向けインストール手順モーダル */}
      <AnimatePresence>
        {showIOSGuide && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowIOSGuide(false)}
            />

            {/* モーダル */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'fixed bottom-0 left-0 right-0 z-50',
                'bg-background rounded-t-2xl',
                'max-h-[80vh] overflow-y-auto',
                'safe-area-inset-bottom'
              )}
            >
              {/* ハンドル */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted" />
              </div>

              <div className="px-6 pb-8">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">ホーム画面に追加</h2>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-2 -m-2 text-muted-foreground hover:text-foreground"
                    aria-label="閉じる"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 手順 */}
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        画面下部の共有ボタンをタップ
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Share className="w-5 h-5" />
                        <span className="text-sm">このアイコンです</span>
                      </div>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        「ホーム画面に追加」を選択
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="w-5 h-5" />
                        <span className="text-sm">下にスクロールすると見つかります</span>
                      </div>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        右上の「追加」をタップ
                      </p>
                    </div>
                  </li>
                </ol>

                {/* 閉じるボタン */}
                <MotionButton
                  variant="outline"
                  size="lg"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full mt-8"
                >
                  閉じる
                </MotionButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
