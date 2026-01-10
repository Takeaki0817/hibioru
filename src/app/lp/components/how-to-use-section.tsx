import { LogIn, PenLine, Calendar, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: LogIn,
    number: '01',
    title: 'Googleでログイン',
    description: 'アカウント作成不要。Googleアカウントがあれば30秒で開始。',
    time: '30秒',
  },
  {
    icon: PenLine,
    number: '02',
    title: '思ったことを記録',
    description: '「+」ボタンから入力。絵文字1つ、一言だけでOK。',
    time: '数秒',
  },
  {
    icon: Calendar,
    number: '03',
    title: 'タイムラインで見返す',
    description: '日付ごとに時系列表示。カレンダーで過去にジャンプ。',
    time: 'いつでも',
  },
]

export function HowToUseSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* 背景装飾 */}
      <div className="floating-orb floating-orb-accent animate-float absolute -left-32 top-1/3 h-72 w-72" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2>
            <span className="gradient-text">3ステップ</span>で、今日から始められます
          </h2>
          <p>アカウント作成不要、すぐにスタート</p>
        </div>

        {/* ステップカード */}
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="glass-card h-full rounded-2xl p-6">
                {/* 番号バッジ */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-bold text-primary/20">
                    {step.number}
                  </span>
                </div>

                {/* タイトル */}
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {step.title}
                </h3>

                {/* 説明 */}
                <p className="mb-4 text-sm text-muted-foreground">
                  {step.description}
                </p>

                {/* 所要時間 */}
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span>⏱️</span>
                  <span>{step.time}</span>
                </div>
              </div>

              {/* 接続矢印 */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 補足ポイント */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { emoji: '✨', text: '絵文字1つでOK' },
            { emoji: '🔒', text: '誰にも見せない' },
            { emoji: '📷', text: '画像も添付可能' },
          ].map((point, index) => (
            <div
              key={index}
              className="flex items-center justify-center gap-2 rounded-xl bg-muted/30 py-3 text-sm"
            >
              <span>{point.emoji}</span>
              <span className="text-muted-foreground">{point.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
