import { Skeleton } from '@/components/ui/skeleton'

/**
 * タイムラインページのローディングUI
 * Suspenseバウンダリのフォールバックとして使用
 */
export default function TimelineLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="space-y-3 w-full max-w-md px-4">
        <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
        <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
        <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
      </div>
      <p className="text-muted-foreground">読み込み中...</p>
      <span className="sr-only">タイムラインを読み込んでいます</span>
    </div>
  )
}
