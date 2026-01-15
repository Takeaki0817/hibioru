import { Skeleton } from '@/components/ui/skeleton'

/**
 * 編集ページのローディングUI
 * Suspenseバウンダリのフォールバックとして使用
 */
export default function EditEntryLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="w-full max-w-md space-y-4 px-4">
        <Skeleton className="h-40 w-full rounded-lg bg-primary-100" />
        <Skeleton className="h-12 w-full rounded-lg bg-primary-100" />
      </div>
      <p className="text-muted-foreground">編集フォームを読み込み中...</p>
      <span className="sr-only">編集フォームを読み込んでいます</span>
    </div>
  )
}
