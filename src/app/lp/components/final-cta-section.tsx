import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { ArrowRight, Check, Heart } from 'lucide-react'

const benefits = [
  '完全無料で使える',
  '絵文字1つでOK',
  'いつでも退会可能',
]

export function FinalCTASection() {
  return (
    <section className="relative overflow-hidden">
      {/* メインCTAエリア */}
      <div className="relative px-4 py-20 sm:px-6 lg:px-8">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />

        {/* フローティングオーブ */}
        <div className="floating-orb floating-orb-primary animate-float-slow absolute -left-20 top-20 h-64 w-64" />
        <div className="floating-orb floating-orb-accent animate-float absolute -right-20 bottom-20 h-72 w-72" />
        <div className="floating-orb floating-orb-golden animate-float-delay absolute left-1/3 top-1/2 h-48 w-48" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* ヘッドライン */}
          <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            今日から、
            <br className="sm:hidden" />
            「<span className="gradient-text">続かない</span>」を
            <br className="hidden sm:inline" />
            卒業しませんか？
          </h2>

          {/* サブコピー */}
          <p className="mb-8 text-lg text-muted-foreground">
            まずは1日、絵文字1つから始めてみてください。
          </p>

          {/* ベネフィットリスト */}
          <div className="mb-10 flex flex-wrap justify-center gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm"
              >
                <Check className="h-4 w-4 text-primary" />
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTAボタン */}
          <div className="mb-12">
            <Button
              asChild
              size="lg"
              className="cta-glow animate-pulse-glow group h-16 px-12 text-xl font-bold"
            >
              <Link href="/">
                無料で始める
                <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* 開発者メッセージ */}
          <div className="glass-card mx-auto max-w-2xl rounded-2xl p-8">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 text-accent-foreground" />
              <span className="text-sm font-medium text-primary">開発者より</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              私自身、ADHDの気質により20年間、日記やログの継続に失敗してきました。
              「書かなきゃ」と思っても、いざ開くと書けない。気づいたら数日空いて、やる気がなくなる。
              <br className="hidden sm:inline" />
              <br className="hidden sm:inline" />
              この経験から、<span className="font-semibold text-foreground">続けやすさに特化したアプリ</span>を作りました。
              <br />
              同じ悩みを持つ方の役に立てれば嬉しいです。
            </p>
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-border/50 bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* ロゴ */}
            <div className="flex items-center gap-2">
              <Logo className="h-6" />
            </div>

            {/* リンク */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                ログイン
              </Link>
              <span className="text-border">|</span>
              <span>お問い合わせはアプリ内フィードバックから</span>
            </div>
          </div>

          {/* コピーライト */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ヒビオル. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </section>
  )
}
