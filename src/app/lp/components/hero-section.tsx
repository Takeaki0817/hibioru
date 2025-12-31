import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background px-4 py-20 sm:px-6 md:py-28 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {/* ロゴ・タイトル */}
        <div className="mb-8">
          <h1 className="mb-4 flex justify-center">
            <Logo className="h-16 sm:h-20 md:h-24" />
            <span className="sr-only">ヒビオル</span>
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">
            日々を織る。思考記録アプリ
          </p>
        </div>

        {/* キャッチコピー */}
        <div className="mb-8">
          <p className="text-lg text-foreground/90 sm:text-xl">
            1日の中での心の動きを記録する
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            絵文字1つ、一言だけでOK。誰にも見せない、自分だけの記録。
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">βテストに参加する</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href="#features">機能を見る</a>
          </Button>
        </div>

        {/* バッジ */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            βテスト募集中
          </span>
          <span className="rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            〜2026年1月中旬
          </span>
        </div>

        {/* サブテキスト */}
        <p className="mt-8 text-sm text-muted-foreground">
          ADHD当事者が作った、続けることに特化したアプリ
        </p>
      </div>
    </section>
  )
}
