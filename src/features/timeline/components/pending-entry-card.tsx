'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import type { PendingEntry } from '@/stores/pending-entry-store'
import { usePendingEntryStore } from '@/stores/pending-entry-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PendingEntryCardProps {
  entry: PendingEntry
}

// 絵文字のみかどうかを判定
function isEmojiOnly(content: string): boolean {
  const emojiRegex = /^[\p{Emoji}\s]+$/u
  const trimmed = content.trim()
  return trimmed.length <= 20 && emojiRegex.test(trimmed)
}

// ステータスに応じたメッセージ
function getStatusMessage(status: PendingEntry['status']): string {
  switch (status) {
    case 'pending':
      return '準備中...'
    case 'uploading':
      return '画像をアップロード中...'
    case 'saving':
      return '保存中...'
    case 'failed':
      return '投稿に失敗しました'
    default:
      return ''
  }
}

// カードのアニメーション
const cardVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

export function PendingEntryCard({ entry }: PendingEntryCardProps) {
  const router = useRouter()
  const clear = usePendingEntryStore((s) => s.clear)

  const emojiOnly = useMemo(() => isEmojiOnly(entry.content), [entry.content])
  const isFailed = entry.status === 'failed'
  const statusMessage = getStatusMessage(entry.status)

  // 再編集ボタンのクリック処理
  const handleRetry = () => {
    clear()
    router.push('/new')
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        'relative rounded-xl mx-4 my-2',
        'border-2 border-dashed',
        isFailed
          ? 'border-destructive/50 bg-destructive/5'
          : 'border-primary/30 bg-primary/5',
        // セパレータ線
        'after:absolute after:bottom-0 after:left-4 after:right-4',
        'after:h-px after:bg-border'
      )}
    >
      <div className="px-4 py-6">
        {/* ステータス表示 */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {isFailed ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className={isFailed ? 'text-destructive' : 'text-muted-foreground'}>
            {statusMessage}
          </span>
        </div>

        {/* コンテンツ表示（半透明） */}
        <div className={cn('opacity-60', isFailed && 'opacity-40')}>
          {emojiOnly ? (
            <div className="mt-3 flex items-center justify-center py-4">
              <span className="text-5xl">{entry.content.trim()}</span>
            </div>
          ) : (
            <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {entry.content}
            </div>
          )}

          {/* 画像プレビュー */}
          {entry.images.length > 0 && (
            <div className={cn(
              'mt-3 gap-2',
              entry.images.length === 1 ? 'block' : 'flex'
            )}>
              {entry.images.map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative overflow-hidden rounded-lg bg-muted',
                    entry.images.length === 1 ? 'w-full h-64' : 'flex-1 h-48'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`添付画像 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 失敗時の再編集ボタン */}
        {isFailed && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              再編集する
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
