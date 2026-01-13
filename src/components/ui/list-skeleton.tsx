import { cn } from '@/lib/utils'

/**
 * スケルトンのバリアント
 * - feed: フィード用（アバター + 名前 + コンテンツ）
 * - notification: 通知用（アバター + 名前 + コンテンツ）
 * - user: ユーザーリスト用（アバター + 名前 + ボタン）
 */
type ListSkeletonVariant = 'feed' | 'notification' | 'user'

interface ListSkeletonProps {
  /** スケルトン数（デフォルト: 3） */
  count?: number
  /** 表示バリアント */
  variant?: ListSkeletonVariant
  /** アクセシビリティラベル */
  label?: string
  /** 追加のクラス名 */
  className?: string
}

/**
 * リスト型スケルトンローディング
 * 共通化された読み込み中表示コンポーネント
 */
export function ListSkeleton({
  count = 3,
  variant = 'feed',
  label,
  className,
}: ListSkeletonProps) {
  // バリアントに応じたラベルを設定
  const defaultLabels: Record<ListSkeletonVariant, string> = {
    feed: 'フィードを読み込み中',
    notification: '通知を読み込み中',
    user: 'ユーザーリストを読み込み中',
  }
  const ariaLabel = label ?? defaultLabels[variant]

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn('space-y-4', variant === 'user' && 'space-y-2', className)}
    >
      <span className="sr-only">{ariaLabel}...</span>
      {[...Array(count)].map((_, i) => (
        <SkeletonItem key={i} variant={variant} />
      ))}
    </div>
  )
}

interface SkeletonItemProps {
  variant: ListSkeletonVariant
}

function SkeletonItem({ variant }: SkeletonItemProps) {
  if (variant === 'user') {
    // ユーザーリスト用: アバター + 名前 + ボタン
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
        aria-hidden="true"
      >
        <div className="size-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
      </div>
    )
  }

  // feed / notification 用: アバター + 名前 + コンテンツ
  // notification はコンテンツ部分がやや低い（h-10 vs h-12）
  const contentHeight = variant === 'notification' ? 'h-10' : 'h-12'

  return (
    <div
      className="p-4 rounded-xl border border-border bg-card"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className={cn(contentHeight, 'bg-muted rounded-lg animate-pulse')} />
    </div>
  )
}
