import { LogIn, PenLine, Calendar } from 'lucide-react'

export function HowToUseSection() {
  const steps = [
    {
      icon: LogIn,
      title: 'Googleでログイン',
      description:
        'ヒビオルにアクセスして「Googleでログイン」をタップ。Googleアカウントがあればすぐに始められます。',
    },
    {
      icon: PenLine,
      title: '思ったことを記録',
      description:
        '画面下の「＋」ボタンをタップして入力。絵文字1つだけでもOK。一言だけでもOK。思ったままを書きましょう。',
    },
    {
      icon: Calendar,
      title: 'タイムラインで見返す',
      description:
        '日付ごとに記録が時系列で表示されます。右上の「N月」をタップでカレンダー表示、過去の記録にジャンプできます。',
    },
  ]

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* タイトル */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            使い方はシンプル
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            3ステップで今すぐ始められます
          </p>
        </div>

        {/* ステップカード */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                {/* ステップ番号 */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-6 text-primary" />
                  </div>
                </div>

                {/* タイトル */}
                <h3 className="mb-3 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>

                {/* 説明 */}
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>

                {/* 接続線（最後以外） */}
                {index < steps.length - 1 && (
                  <div className="absolute -right-4 top-6 hidden h-0.5 w-8 bg-primary/20 md:block" />
                )}
              </div>
            )
          })}
        </div>

        {/* 補足 */}
        <div className="mt-12 rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h4 className="mb-3 text-center text-lg font-semibold text-foreground">
            ポイント
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                絵文字1つだけでもOK、文章として整っていなくてもOK
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>誰にも見せないので、思ったままを書く</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-primary">✓</span>
              <span>
                画像を添付したい場合は📷ボタンをタップ
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
