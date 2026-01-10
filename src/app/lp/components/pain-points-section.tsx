import { Brain, Clock, Frown, PenOff, MessageCircleOff } from 'lucide-react'

const painPoints = [
  {
    icon: Clock,
    emoji: '😶‍🌫️',
    title: '記憶が抜ける',
    description: '気づいたら1日、1週間、1年が過ぎて、何をしていたか覚えていない',
  },
  {
    icon: Frown,
    emoji: '😮‍💨',
    title: '続かない',
    description: '日記や日報を続けようとしたけど、続いたことがない',
  },
  {
    icon: PenOff,
    emoji: '😩',
    title: '書くのが面倒',
    description: '人に見せる文章にするのが億劫。そこまでの気力がない',
  },
  {
    icon: Brain,
    emoji: '🌀',
    title: '頭がうるさい',
    description: 'モヤモヤが止まらない。考え事で集中できない、眠れない',
  },
  {
    icon: MessageCircleOff,
    emoji: '🤐',
    title: '吐き出す場所がない',
    description: '愚痴や怒り、悲しみを安心して出せる場所がほしい',
  },
]

export function PainPointsSection() {
  return (
    <section className="section-gradient-subtle px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2 className="text-foreground">
            こんな経験、
            <span className="gradient-text">ありませんか？</span>
          </h2>
          <p>一つでも当てはまるなら、ヒビオルが役に立つかもしれません</p>
        </div>

        {/* ペインポイントグリッド */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="glass-card group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              {/* 背景装飾 */}
              <div className="absolute -right-4 -top-4 text-6xl opacity-10 transition-opacity group-hover:opacity-20">
                {point.emoji}
              </div>

              {/* コンテンツ */}
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <point.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{point.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 筆記開示の説明 */}
        <div className="mt-16 text-center">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            なぜ「書き出す」ことが効くのか
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-foreground">
            心理学では「<span className="font-semibold text-primary">筆記開示</span>
            」と呼ばれ、
            <br className="hidden sm:inline" />
            書き出すことで思考が整理され、ストレスが軽減されることがわかっています。
          </p>
          <p className="mt-3 text-base text-muted-foreground">
            でも、続けることが難しい。だから、ヒビオルを作りました。
          </p>
        </div>
      </div>
    </section>
  )
}
