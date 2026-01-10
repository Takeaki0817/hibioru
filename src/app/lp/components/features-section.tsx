import { Flame, Shield, Bell, Smartphone, Users } from 'lucide-react'

const features = [
  {
    icon: Flame,
    emoji: '🔥',
    title: 'ストリーク',
    subtitle: '継続記録',
    description: '毎日記録すると継続日数がカウント。途切れても最長記録は残ります。',
    color: 'from-orange-500/20 to-red-500/20',
  },
  {
    icon: Shield,
    emoji: '🧵',
    title: 'ほつれ',
    subtitle: 'スキップ機能',
    description: '週2回まで使える救済機能。記録できない日も継続を守ります。',
    color: 'from-primary/20 to-emerald-500/20',
  },
  {
    icon: Bell,
    emoji: '🔔',
    title: '通知',
    subtitle: 'リマインド',
    description: '最大5つの時刻設定と追いリマインドで、記録忘れを防止。',
    color: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    icon: Smartphone,
    emoji: '📱',
    title: 'マルチデバイス',
    subtitle: 'どこからでも',
    description: 'スマホ・PC・タブレット対応。インストール不要、自動同期。',
    color: 'from-violet-500/20 to-purple-500/20',
  },
  {
    icon: Users,
    emoji: '🎉',
    title: 'みんなで応援',
    subtitle: '適度なソーシャル',
    description: '達成をお祝いで応援。DM・フォロワー数非表示でストレスフリー。',
    color: 'from-pink-500/20 to-rose-500/20',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* 背景装飾 */}
      <div className="floating-orb floating-orb-primary animate-float absolute -right-32 top-20 h-80 w-80" />
      <div className="floating-orb floating-orb-golden animate-float-delay absolute -left-20 bottom-20 h-64 w-64" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2>
            継続を支える
            <span className="gradient-text">5つの工夫</span>
          </h2>
          <p>続けやすさに特化した機能設計</p>
        </div>

        {/* 機能グリッド */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`glass-card group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                index === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
            >
              {/* 背景グラデーション */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              {/* 背景絵文字 */}
              <div className="absolute -right-4 -top-4 text-7xl opacity-10 transition-all duration-300 group-hover:opacity-20 group-hover:scale-110">
                {feature.emoji}
              </div>

              {/* コンテンツ */}
              <div className="relative z-10">
                {/* アイコン */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>

                {/* タイトル */}
                <div className="mb-3">
                  <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-primary">{feature.subtitle}</p>
                </div>

                {/* 説明 */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ADHD配慮の注記 */}
        <div className="mt-12 text-center">
          <div className="glass-card mx-auto inline-flex items-center gap-3 rounded-full px-6 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm">💡</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">ADHD配慮設計</span>
              ：報酬系を過剰に刺激しない、穏やかなソーシャル機能
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
