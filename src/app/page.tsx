import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="flex justify-center">
            <Logo size="2xl" />
            <span className="sr-only">ヒビオル</span>
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">日々を織る</p>
        </div>

        {/* サービス紹介 */}
        <div className="space-y-4 text-center">
          <p className="text-foreground">
            ADHD当事者のための
            <br />
            瞬間記録アプリ
          </p>

          <div className="py-4 space-y-3 text-sm text-muted-foreground">
            <p>2タップで記録完了</p>
            <p>毎日続けることが目的</p>
            <p>立派な日記は要らない</p>
          </div>
        </div>

        {/* CTAボタン */}
        <div className="mt-8">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">はじめる</Link>
          </Button>
        </div>

        {/* フッター */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          継続することが最大の目的。
          <br />
          立派な日記を書くことではない。
        </p>
      </div>
    </div>
  )
}
