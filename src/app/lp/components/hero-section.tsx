import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-background px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      {/* 背景装飾: フローティングオーブ */}
      <div className="floating-orb floating-orb-primary animate-float-slow absolute -left-32 top-20 h-96 w-96" />
      <div className="floating-orb floating-orb-accent animate-float absolute -right-20 top-40 h-72 w-72" />
      <div className="floating-orb floating-orb-golden animate-float-delay absolute bottom-20 left-1/4 h-64 w-64" />
      <div className="floating-orb floating-orb-primary animate-float absolute -right-40 bottom-40 h-80 w-80" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* 左カラム: テキストコンテンツ */}
          <div className="text-center lg:text-left">
            {/* ロゴ */}
            <div className="mb-8 flex justify-center lg:justify-start">
              <Logo className="h-12 sm:h-14" />
            </div>

            {/* メインヘッドライン */}
            <h1 className="mb-6">
              <span className="gradient-text block text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                「続かない」を、
              </span>
              <span className="gradient-text block text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                終わりにする。
              </span>
            </h1>

            {/* サブコピー */}
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              ADHDの開発者が20年の挫折を経て作った、
              <br className="hidden sm:inline" />
              絵文字1つから始められる記録アプリ
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="cta-glow group relative h-14 w-full px-8 text-lg font-semibold sm:w-auto"
              >
                <Link href="/">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-14 w-full px-8 text-lg sm:w-auto"
              >
                <a href="#features">機能を見る</a>
              </Button>
            </div>

            {/* 補足テキスト */}
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>完全無料・登録30秒・いつでも退会可能</span>
            </div>
          </div>

          {/* 右カラム: スマホモック（実際の画面スクリーンショット） */}
          <div className="relative flex justify-center lg:justify-end">
            {/* グラスモーフィズムの背景装飾 */}
            <div className="glass-card absolute -inset-4 rounded-3xl opacity-50" />

            {/* スマホスクリーンショット */}
            <div className="relative z-10">
              <Image
                src="/lp/screenshot-hero-mock.png"
                alt="ヒビオルのタイムライン画面 - ストリーク表示と記録一覧"
                width={280}
                height={560}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
