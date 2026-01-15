'use client'

import { useCallback, useMemo, useState, memo, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TimelineEntry, TimelinePage } from '../types'
import { cn } from '@/lib/utils'

export interface EntryCardProps {
  entry: TimelineEntry
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
    prev.createdAt.getTime() === next.createdAt.getTime()
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

// 絵文字のみかどうかを判定
function isEmojiOnly(content: string): boolean {
  // 絵文字の正規表現パターン（絵文字とスペースのみ）
  const emojiRegex = /^[\p{Emoji}\s]+$/u
  const trimmed = content.trim()

  // 短い（20文字以下）かつ絵文字のみの場合
  return trimmed.length <= 20 && emojiRegex.test(trimmed)
}

// 楽観的エントリかどうかを判定
function isOptimisticEntry(id: string): boolean {
  return id.startsWith('optimistic-')
}

// 楽観的エントリが実際のエントリに置き換わるまで待機
async function waitForActualEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  createdAt: Date,
  timeoutMs: number = 5000
): Promise<string | null> {
  const startTime = Date.now()
  const pollInterval = 100 // 100msごとにチェック

  return new Promise((resolve) => {
    const checkCache = () => {
      // タイムアウトチェック
      if (Date.now() - startTime > timeoutMs) {
        resolve(null)
        return
      }

      // キャッシュからタイムラインデータを取得
      const queryCache = queryClient.getQueryCache()
      const queries = queryCache.findAll({
        queryKey: ['entries', 'timeline', userId],
        exact: false,
      })

      // 全てのタイムラインキャッシュを走査
      for (const query of queries) {
        const data = query.state.data as InfiniteData<TimelinePage> | undefined
        if (!data?.pages) continue

        for (const page of data.pages) {
          for (const entry of page.entries) {
            // 楽観的エントリでないかつ、同じcreatedAtを持つエントリを探す
            // （createdAtは秒精度で比較）
            if (
              !isOptimisticEntry(entry.id) &&
              Math.abs(entry.createdAt.getTime() - createdAt.getTime()) < 1000
            ) {
              resolve(entry.id)
              return
            }
          }
        }
      }

      // 見つからなければ次のポーリング
      setTimeout(checkCache, pollInterval)
    }

    checkCache()
  })
}

export const EntryCard = memo(forwardRef<HTMLDivElement, EntryCardProps>(
  function EntryCard({ entry }, ref) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isWaiting, setIsWaiting] = useState(false)

    // 絵文字のみかどうか
    const emojiOnly = useMemo(() => isEmojiOnly(entry.content), [entry.content])

    // 楽観的エントリかどうか
    const isOptimistic = isOptimisticEntry(entry.id)

    // タップ処理
    const handleTap = useCallback(async () => {
      // 楽観的エントリの場合は保存完了を待機
      if (isOptimistic) {
        setIsWaiting(true)
        try {
          const actualId = await waitForActualEntry(
            queryClient,
            entry.userId,
            entry.createdAt
          )

          if (actualId) {
            router.push(`/edit/${actualId}`)
          } else {
            // タイムアウト：エラーメッセージを表示
            toast.error('保存処理中です', {
              description: 'しばらくしてから再度お試しください',
            })
          }
        } finally {
          setIsWaiting(false)
        }
        return
      }

      router.push(`/edit/${entry.id}`)
    }, [router, entry.id, entry.userId, entry.createdAt, isOptimistic, queryClient])

    // キーボード操作（Enter/Spaceで編集画面へ）
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleTap()
      }
    }, [handleTap])

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
        role="button"
        tabIndex={0}
        aria-label={`${timeLabel}の記録を編集`}
        aria-busy={isWaiting}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={isWaiting ? undefined : 'hover'}
        whileTap={isWaiting ? undefined : 'tap'}
        className={cn(
          'relative cursor-pointer rounded-xl',
          'transition-colors',
          // フォーカスリング
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // セパレータ線（擬似要素）
          'after:absolute after:bottom-0 after:left-4 after:right-4',
          'after:h-px after:bg-border',
          // ローディング中は操作を無効化
          isWaiting && 'pointer-events-none'
        )}
        onClick={handleTap}
        onKeyDown={handleKeyDown}
      >
        {/* ローディングオーバーレイ */}
        {isWaiting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
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
                  />
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </motion.div>
    )
  }
), areEntryPropsEqual)
