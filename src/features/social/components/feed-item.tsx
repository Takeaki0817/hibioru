'use client'

import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Loader2, Share2, Quote } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useFeedItem } from '../hooks/use-feed-item'
import type { Particle } from '../hooks/use-feed-item'
import type { SocialFeedItem } from '../types'
import { ACHIEVEMENT_ICONS, getAchievementMessage } from '../constants'
import { cn } from '@/lib/utils'
import { getTimeAgo } from '@/lib/date-utils'
import { feedItemVariants, particleVariants } from '@/lib/animations'

export interface FeedItemProps {
  item: SocialFeedItem
}

/**
 * ソーシャルフィードの個別アイテム
 * 達成または共有投稿を表示し、お祝い機能を提供
 */
export function FeedItem({ item }: FeedItemProps) {
  const timeAgo = getTimeAgo(item.createdAt)
  const isSharedEntry = item.type === 'shared_entry'

  // useFeedItem でお祝い状態とパーティクルエフェクトを管理
  const { isCelebrated, isPending, toggle, showParticles, particles } = useFeedItem({
    achievementId: item.id,
    initialIsCelebrated: item.isCelebrated,
    initialCount: item.celebrationCount,
  })

  // アクセシビリティ用ID
  const descriptionId = useId()

  // アクセシブルなラベルを生成
  const contentLabel = isSharedEntry
    ? `${item.user.displayName}さんの共有投稿`
    : item.achievement
      ? `${item.user.displayName}さんの${getAchievementMessage(item.achievement.type, item.achievement.threshold)}`
      : `${item.user.displayName}さんの投稿`

  const actionDescription = isCelebrated
    ? 'クリックでお祝いを取り消す'
    : 'クリックでお祝いする'

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isCelebrated}
      aria-label={isCelebrated ? `${contentLabel}（お祝い済み）` : contentLabel}
      aria-describedby={descriptionId}
      aria-busy={isPending}
      variants={feedItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full text-left rounded-xl transition-all',
        'disabled:pointer-events-none disabled:opacity-70',
        isCelebrated
          ? 'border border-celebrate-200 bg-celebrate-50/50 dark:border-celebrate-300/30 dark:bg-celebrate-100/20'
          : 'border-2 border-dashed border-muted-foreground/30 bg-card hover:border-celebrate-300 hover:bg-celebrate-50/30 dark:hover:bg-celebrate-100/10 hover:shadow-md cursor-pointer'
      )}
    >
      {/* スクリーンリーダー向け操作説明 */}
      <span id={descriptionId} className="sr-only">
        {actionDescription}
      </span>

      {/* 内側div: ボーダー太さの差をpaddingで吸収 */}
      <div className={cn('flex items-start gap-4', isCelebrated ? 'p-[15px]' : 'p-[14px]')}>
        {/* 左側: ヘッダー + コンテンツ */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="size-10 shrink-0 ring-2 ring-primary-100 dark:ring-primary-900">
              <AvatarImage src={item.user.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" aria-hidden="true">
                {item.user.displayName?.charAt(0) ?? item.user.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{item.user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{item.user.username} · {timeAgo}
              </p>
            </div>
          </div>

          {/* コンテンツ: 達成 */}
          {item.type === 'achievement' && item.achievement && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary-50/50 dark:bg-primary-950/30">
              {(() => {
                const { icon: Icon, color } = ACHIEVEMENT_ICONS[item.achievement.type]
                return <Icon className={`size-5 shrink-0 ${color}`} />
              })()}
              <span className="text-sm text-primary-600 dark:text-primary-400">
                {getAchievementMessage(item.achievement.type, item.achievement.threshold)}
              </span>
            </div>
          )}

          {/* コンテンツ: 共有投稿 */}
          {isSharedEntry && item.entry && (
            <SharedEntryContent entry={item.entry} displayName={item.user.displayName} />
          )}
        </div>

        {/* 右側: お祝いアイコン（ステータス表示） */}
        <CelebrationIcon
          isCelebrated={isCelebrated}
          isPending={isPending}
          showParticles={showParticles}
          particles={particles}
        />
      </div>
    </motion.button>
  )
}

// 共有投稿コンテンツ
interface SharedEntryContentProps {
  entry: NonNullable<SocialFeedItem['entry']>
  displayName: string
}

function SharedEntryContent({ entry, displayName }: SharedEntryContentProps) {
  return (
    <div className="space-y-2">
      {/* 共有ラベル（通知タブと統一） */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/30">
        <Share2 className="size-5 shrink-0 text-sky-500" />
        <span className="text-sm text-sky-600 dark:text-sky-400">
          投稿を共有しました
        </span>
      </div>

      {/* 投稿内容カード */}
      <div className="relative rounded-lg bg-card p-3 border border-border">
        {/* 引用マーク */}
        <Quote className="absolute top-2 right-2 size-4 text-muted-foreground/20" />

        {/* テキストコンテンツ */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-3 pr-5">
          {entry.content}
        </p>

        {/* 画像プレビュー */}
        {entry.imageUrls && entry.imageUrls.length > 0 && (
          <SharedEntryImages imageUrls={entry.imageUrls} displayName={displayName} />
        )}
      </div>
    </div>
  )
}

// 共有投稿の画像表示
interface SharedEntryImagesProps {
  imageUrls: string[]
  displayName: string
}

function SharedEntryImages({ imageUrls, displayName }: SharedEntryImagesProps) {
  return (
    <div className="mt-3">
      {imageUrls.length === 1 ? (
        /* 画像1枚: 大きく表示 */
        <div className="relative overflow-hidden rounded-md">
          <img
            src={imageUrls[0]}
            alt={`${displayName}さんの共有画像`}
            className="w-full max-h-40 object-cover"
          />
        </div>
      ) : (
        /* 画像2枚以上: グリッド表示 */
        <div
          className={cn(
            'grid gap-1.5',
            imageUrls.length === 2 && 'grid-cols-2',
            imageUrls.length >= 3 && 'grid-cols-3'
          )}
        >
          {imageUrls.slice(0, 3).map((url, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-md"
            >
              <img
                src={url}
                alt={`${displayName}さんの共有画像 ${index + 1}`}
                className="size-full object-cover"
              />
              {/* 残り枚数表示 */}
              {index === 2 && imageUrls.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-medium">
                  +{imageUrls.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// お祝いアイコン（パーティクルエフェクト含む）
interface CelebrationIconProps {
  isCelebrated: boolean
  isPending: boolean
  showParticles: boolean
  particles: Particle[]
}

function CelebrationIcon({ isCelebrated, isPending, showParticles, particles }: CelebrationIconProps) {
  return (
    <div className="shrink-0 flex items-center justify-center size-12 rounded-xl relative">
      {isPending ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <motion.div
          animate={showParticles ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PartyPopper
            className={cn(
              'size-6 transition-all',
              isCelebrated
                ? 'text-celebrate-400 fill-celebrate-400'
                : 'text-muted-foreground/50'
            )}
          />
        </motion.div>
      )}

      {/* パーティクルエフェクト */}
      <AnimatePresence>
        {showParticles && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                custom={{
                  angle: particle.angle,
                  distance: particle.distance,
                  delay: particle.delay,
                }}
                variants={particleVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0 }}
                className={cn('absolute rounded-full', particle.size, particle.color)}
                style={{ originX: 0.5, originY: 0.5 }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
