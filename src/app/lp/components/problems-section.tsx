import { Check } from 'lucide-react'

export function ProblemsSection() {
  const problems = [
    '気がついたら1日、1週間、1年が過ぎて、何をしていたかあまり覚えていない',
    '日記や日報を続けようとしたけど、続いたことがない',
    '人に話せないことや、読んでもらうための文章にするのが面倒くさい',
    '頭の中のモヤモヤを書き出してスッキリしたい',
    '愚痴や怒り、悲しみを吐き出す場所がほしい',
    '考え事で集中できない、眠れないときに、頭を空っぽにしたい',
    '記録したデータをAIを使って振り返りたい',
  ]

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* タイトル */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            こんな悩みはありませんか？
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            ヒビオルは、こうした悩みを解決するために作りました
          </p>
        </div>

        {/* 問題リスト */}
        <div className="grid gap-4 sm:grid-cols-2">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <Check className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm text-card-foreground">{problem}</p>
            </div>
          ))}
        </div>

        {/* 結論 */}
        <div className="mt-12 rounded-lg bg-primary/5 p-6 text-center">
          <p className="text-base font-medium text-foreground sm:text-lg">
            誰かに見せる文章を書く必要はありません。
            <br />
            自分だけの記録として、思ったことをそのまま残せます。
          </p>
        </div>
      </div>
    </section>
  )
}
