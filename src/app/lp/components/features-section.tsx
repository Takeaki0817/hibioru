import { Flame, Shield, Bell, Smartphone } from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: Flame,
      title: 'ストリーク（継続記録）',
      description:
        '毎日記録すると、継続日数がカウントされます。日付の切り替えは毎日0:00。継続が途切れると0にリセットされますが、最長記録は残ります。',
      highlights: ['Duolingo式の継続モチベーション', '最長記録を更新する楽しさ'],
    },
    {
      icon: Shield,
      title: 'ほつれ（スキップ機能）',
      description:
        '「今日は記録できない」という日を守るための機能。記録がない日は自動で「ほつれ」が使われ、継続記録は途切れません。',
      highlights: ['週2回まで使える', '毎週月曜0:00にリセット', '繰り越しなし'],
    },
    {
      icon: Bell,
      title: '通知・リマインド',
      description:
        '記録を忘れないように、リマインド通知を設定できます。最大5個まで設定可能で、各リマインダーはトグルでオン/オフ切り替え。',
      highlights: ['設定した時刻に通知', '記録の有無にかかわらず送信'],
    },
    {
      icon: Smartphone,
      title: 'マルチデバイス対応',
      description:
        'Webアプリなので、スマホ・タブレット・PCなど、どのデバイスからでもアクセス可能。思いついたときに、手元のデバイスですぐ記録。',
      highlights: ['アプリのインストール不要', 'デバイス間で自動同期'],
    },
  ]

  return (
    <section id="features" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* タイトル */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            継続をサポートする工夫
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            続けやすさに特化した機能設計
          </p>
        </div>

        {/* 機能カード */}
        <div className="grid gap-8 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* アイコン・タイトル */}
                <div className="mb-4 flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {feature.title}
                    </h3>
                  </div>
                </div>

                {/* 説明 */}
                <p className="mb-4 text-sm text-muted-foreground">
                  {feature.description}
                </p>

                {/* ハイライト */}
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-card-foreground"
                    >
                      <span className="mt-1 text-primary">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
