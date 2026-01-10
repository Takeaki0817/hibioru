import { Zap, Shield, Lock } from 'lucide-react'

const solutions = [
  {
    icon: Zap,
    number: '01',
    title: '最小単位を極限まで小さく',
    description: '絵文字1つ、一言だけでOK。2タップで記録完了。',
    highlight: '「やらない理由」を潰す',
    examples: ['☕️', '😴', '今日も頑張った'],
  },
  {
    icon: Shield,
    number: '02',
    title: '途切れても大丈夫な仕組み',
    description: 'Duolingo式のストリーク（継続記録）と、ほつれ（スキップ機能）で完全な失敗を防ぐ。',
    highlight: '損失回避の心理を活用',
    features: ['ストリーク: 継続の可視化', 'ほつれ: 週2回の救済'],
  },
  {
    icon: Lock,
    number: '03',
    title: 'どこからでも、誰にも見せない',
    description: 'スマホ・PC・タブレットどこからでも。完全プライベート、共有は任意。',
    highlight: '安心して吐き出せる',
    features: ['PWA対応', 'クラウド同期'],
  },
]

export function SolutionSection() {
  return (
    <section className="section-gradient-subtle px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2>
            「<span className="gradient-text">続けること</span>」だけに、
            <br className="sm:hidden" />
            特化しました。
          </h2>
          <p>Duolingoで122日続いた仕組みを、記録アプリに応用</p>
        </div>

        {/* 3つの原則 */}
        <div className="grid gap-8 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <div
              key={index}
              className="group relative"
            >
              {/* カード */}
              <div className="glass-card h-full rounded-2xl p-6 transition-all duration-300 hover:shadow-xl">
                {/* 番号 */}
                <div className="mb-4 text-5xl font-bold text-primary/20">
                  {solution.number}
                </div>

                {/* アイコンとタイトル */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <solution.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {solution.title}
                  </h3>
                </div>

                {/* 説明 */}
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {solution.description}
                </p>

                {/* ハイライト */}
                <div className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
                  {solution.highlight}
                </div>

                {/* 例/機能リスト */}
                {solution.examples && (
                  <div className="flex flex-wrap gap-2">
                    {solution.examples.map((example, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-muted/50 px-3 py-1.5 text-sm"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                )}
                {solution.features && (
                  <div className="space-y-1">
                    {solution.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 結論 */}
        <div className="mt-16 text-center">
          <div className="glass-card mx-auto inline-block rounded-2xl px-8 py-6">
            <p className="text-lg font-medium text-foreground">
              誰かに見せる文章を書く必要はありません。
              <br />
              <span className="gradient-text font-bold">自分だけの記録</span>
              として、思ったことをそのまま残せます。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
