import { X, Lightbulb, TrendingUp } from 'lucide-react'

const failures = [
  { name: 'Obsidian', duration: '1ヶ月', reason: 'GitHub同期でトラブル、スマホ操作が不便' },
  { name: 'Notion', duration: '2週間', reason: '設定に疲れて放置' },
  { name: 'Day One', duration: '3日', reason: '綺麗に書こうとして億劫に' },
  { name: '紙の日記', duration: '1週間', reason: '持ち歩くのが面倒' },
]

export function FailureStorySection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* 背景装飾 */}
      <div className="floating-orb floating-orb-accent animate-float-slow absolute -left-20 top-1/4 h-64 w-64" />
      <div className="floating-orb floating-orb-primary animate-float-delay absolute -right-20 bottom-1/4 h-72 w-72" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2 className="text-foreground">
            <span className="gradient-text">20年間</span>、
            <br className="sm:hidden" />
            日記が続いたことがありませんでした。
          </h2>
        </div>

        {/* 開発者紹介 */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-3xl">👨‍💻</span>
          </div>
          <p className="text-lg text-muted-foreground">
            開発者自身がADHDの気質を持ち、
            <br className="sm:hidden" />
            数々の記録ツールで挫折してきました。
          </p>
        </div>

        {/* 挫折歴タイムライン */}
        <div className="mb-16">
          <h3 className="mb-6 text-center text-lg font-semibold text-foreground">
            挫折の歴史
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {failures.map((failure, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-4 text-center"
              >
                <div className="mb-2 flex items-center justify-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-foreground">{failure.name}</span>
                </div>
                <div className="mb-2 text-2xl font-bold text-destructive/80">
                  {failure.duration}
                </div>
                <p className="text-xs text-muted-foreground">{failure.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 転機 */}
        <div className="glass-card mx-auto max-w-3xl rounded-2xl p-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* 転機: Duolingo */}
            <div className="text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">転機</span>
              </div>
              <h4 className="mb-3 text-xl font-bold text-foreground">
                Duolingo 122日継続
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                「最低限しかやらなくなったけど、122日続いた」
                <br />
                この体験が、ヒビオルのヒントになりました。
              </p>
            </div>

            {/* 気づき */}
            <div className="text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <TrendingUp className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-medium text-accent-foreground">気づき</span>
              </div>
              <h4 className="mb-3 text-xl font-bold text-foreground">
                「立派な日記」は要らない
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                日記アプリの目的は「立派な日記を書くこと」ではなく、
                <br />
                「<span className="font-semibold text-primary">記録を途切れさせないこと</span>」だと気づきました。
              </p>
            </div>
          </div>
        </div>

        {/* 導線 */}
        <div className="mt-12 text-center">
          <p className="text-lg font-medium text-foreground">
            だから、「<span className="gradient-text font-bold">続けること</span>」だけに特化したアプリを作りました。
          </p>
        </div>
      </div>
    </section>
  )
}
