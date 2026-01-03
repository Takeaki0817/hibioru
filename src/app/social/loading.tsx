import { Skeleton } from '@/components/ui/skeleton'

/**
 * ソーシャルページのローディングUI
 * Suspenseバウンダリのフォールバックとして使用
 */
export default function SocialLoading() {
  return (
    <div className="container mx-auto p-4 max-w-2xl pb-6">
      <div className="space-y-6">
        {/* ストリーク情報セクション */}
        <section className="space-y-3">
          <Skeleton className="h-6 w-32 rounded bg-primary-100" />
          <Skeleton className="h-24 w-full rounded-lg bg-primary-100" />
        </section>

        {/* 週間記録セクション */}
        <section className="space-y-3">
          <Skeleton className="h-6 w-24 rounded bg-primary-100" />
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full bg-primary-100" />
            ))}
          </div>
        </section>

        {/* 設定セクション */}
        <section className="space-y-3">
          <Skeleton className="h-6 w-20 rounded bg-primary-100" />
          <Skeleton className="h-16 w-full rounded-lg bg-primary-100" />
          <Skeleton className="h-16 w-full rounded-lg bg-primary-100" />
        </section>
      </div>
      <p className="text-center text-muted-foreground mt-6">読み込み中...</p>
    </div>
  )
}
