'use client'

import { useCallback, useMemo, memo, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { TimelineEntry } from '../types'
import { cn } from '@/lib/utils'

export interface EntryCardProps {
  entry: TimelineEntry
  /** LCP対象として最初の画像にpriorityを適用するかどうか */
  isFirstEntry?: boolean
}

// EntryCardのprops比較関数
function areEntryPropsEqual(prevProps: EntryCardProps, nextProps: EntryCardProps): boolean {
  const prev = prevProps.entry
  const next = nextProps.entry
  // 画像URLの配列比較
  const prevImages = prev.imageUrls ?? []
  const nextImages = next.imageUrls ?? []
  const imagesEqual =
    prevImages.length === nextImages.length &&
    prevImages.every((url, i) => url === nextImages[i])

  return (
    prev.id === next.id &&
    prev.content === next.content &&
    imagesEqual &&
    prev.createdAt.getTime() === next.createdAt.getTime() &&
    prevProps.isFirstEntry === nextProps.isFirstEntry
  )
}

// カードのアニメーション設定
const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  hover: {
    backgroundColor: 'var(--primary-50)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  tap: {
    backgroundColor: 'var(--primary-100)',
    scale: 0.99,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
}

// 絵文字のみかどうかを判定するための正規表現（モジュールレベルでホイスト）
const EMOJI_ONLY_REGEX = /^[\p{Emoji}\s]+$/u

// 絵文字のみかどうかを判定
function isEmojiOnly(content: string): boolean {
  const trimmed = content.trim()
  // 短い（20文字以下）かつ絵文字のみの場合
  return trimmed.length <= 20 && EMOJI_ONLY_REGEX.test(trimmed)
}

export const EntryCard = memo(forwardRef<HTMLDivElement, EntryCardProps>(
  function EntryCard({ entry, isFirstEntry = false }, ref) {
    const router = useRouter()

    // 楽観的エントリかどうかを判定（軽量な文字列操作なのでReact Compilerに任せる）
    const isOptimistic = entry.id.startsWith('optimistic-')

    // 絵文字のみかどうか（軽量な判定なのでReact Compilerに任せる）
    const emojiOnly = isEmojiOnly(entry.content)

    // タップ処理
    const handleTap = useCallback(() => {
      if (isOptimistic) return
      router.push(`/edit/${entry.id}`)
    }, [router, entry.id, isOptimistic])

    // キーボード操作（Enter/Spaceで編集画面へ）
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (isOptimistic) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        router.push(`/edit/${entry.id}`)
      }
    }, [router, entry.id, isOptimistic])

    // アクセシビリティラベル用・表示用の時刻文字列（メモ化）
    const timeLabel = useMemo(
      () =>
        entry.createdAt.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      [entry.createdAt]
    )

    return (
      <motion.div
        ref={ref}
        role={isOptimistic ? 'article' : 'button'}
        tabIndex={isOptimistic ? -1 : 0}
        aria-label={`${timeLabel}の記録を編集`}
        aria-disabled={isOptimistic ? true : undefined}
        aria-busy={isOptimistic}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={isOptimistic ? undefined : 'hover'}
        whileTap={isOptimistic ? undefined : 'tap'}
        className={cn(
          'relative rounded-xl',
          'transition-colors',
          // カーソルとオパシティ
          isOptimistic ? 'cursor-default opacity-75' : 'cursor-pointer',
          // フォーカスリング（楽観的でない場合のみ）
          !isOptimistic && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // セパレータ線（擬似要素）
          'after:absolute after:bottom-0 after:left-4 after:right-4',
          'after:h-px after:bg-border'
        )}
        onClick={handleTap}
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-6">
          {/* 時刻表示 */}
          <div className="text-xs text-muted-foreground font-medium">
            {timeLabel}
          </div>

        {/* コンテンツ表示 */}
        {emojiOnly ? (
          // 絵文字のみの場合：中央配置・大きく表示
          <div className="mt-3 flex items-center justify-center py-4">
            <span className="text-5xl">{entry.content.trim()}</span>
          </div>
        ) : (
          // 通常テキストの場合
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {entry.content}
          </div>
        )}

          {/* 画像表示 */}
          {entry.imageUrls && entry.imageUrls.length > 0 && (() => {
            const imageUrls = entry.imageUrls
            const isSingle = imageUrls.length === 1
            return (
              <div className={cn(
                'mt-3 gap-2',
                isSingle ? 'block' : 'flex'
              )}>
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative overflow-hidden rounded-lg',
                      isSingle ? 'w-full h-64' : 'flex-1 h-48'
                    )}
                  >
                    <Image
                      src={url}
                      alt={`投稿画像 ${index + 1}`}
                      fill
                      sizes={isSingle
                        ? '(max-width: 672px) 100vw, 672px'
                        : '(max-width: 672px) 50vw, 336px'}
                      className="object-cover transition-transform hover:scale-105"
                      priority={isFirstEntry && index === 0}
                    />
                  </div>
                ))}
              </div>
            )
          })()}

          {/* 保存中インジケーター */}
          {isOptimistic && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <Loader2 className="size-3 animate-spin" />
              <span>保存中...</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }
), areEntryPropsEqual)
