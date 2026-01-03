import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, MessageSquare, Bug } from 'lucide-react'

export function BetaTestCallSection() {
  const feedbackItems = [
    {
      icon: Heart,
      title: '続けられた理由',
      description: '続けられなかった理由',
    },
    {
      icon: MessageSquare,
      title: '使いづらかった点',
      description: '「こうだったらいいのに」という改善案',
    },
    {
      icon: Bug,
      title: 'バグや不具合',
      description: '画面が崩れる、動かないなど',
    },
  ]

  return (
    <section className="bg-gradient-to-b from-primary/5 to-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* タイトル */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            βテスターへのお願い
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            皆さんの声がアプリを良くします
          </p>
        </div>

        {/* βテストの目的 */}
        <div className="mb-12 rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-semibold text-card-foreground">
            βテストの目的
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 text-primary">•</span>
              <span>
                <strong className="text-foreground">
                  デバイスごとのバグの発見
                </strong>
                ：様々な環境で正しく動作するか確認したい
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 text-primary">•</span>
              <span>
                <strong className="text-foreground">使いやすさの検証</strong>
                ：実際に使ってみて不便な点がないか
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 text-primary">•</span>
              <span>
                <strong className="text-foreground">需要の検証</strong>
                ：このアプリを使いたいと思うか、続けられそうか
              </span>
            </li>
          </ul>
        </div>

        {/* フィードバックしてほしいこと */}
        <div className="mb-12">
          <h3 className="mb-6 text-center text-2xl font-semibold text-foreground">
            フィードバックしてほしいこと
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            {feedbackItems.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className="rounded-lg border bg-card p-5 text-center shadow-sm"
                >
                  <div className="mb-3 flex justify-center">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Icon className="size-6 text-primary" />
                    </div>
                  </div>
                  <h4 className="mb-2 font-semibold text-card-foreground">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 使い方のお願い */}
        <div className="mb-12 rounded-lg bg-primary/5 p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            使い方のお願い
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>毎日1回、何かしら記録してみてください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>絵文字1つ、一言だけでもOK</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>無理に頑張らなくて大丈夫</span>
            </li>
          </ul>
        </div>

        {/* テスト期間 */}
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground">
            βテスト期間：〜 2026年1月中旬（予定）
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">今すぐβテストに参加する</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            ソーシャルページの「フィードバックを送る」ボタンからご意見をお寄せください
          </p>
        </div>
      </div>
    </section>
  )
}
