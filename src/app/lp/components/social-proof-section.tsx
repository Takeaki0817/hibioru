import { Flame, Quote, Users } from 'lucide-react'

// 将来的にはDBから取得
const stats = {
  developerStreak: 30, // 開発者の継続日数（更新予定）
  totalUsers: '—', // 将来: 実ユーザー数
}

// 将来のユーザーレビュー（プレースホルダー）
const testimonials = [
  {
    avatar: '👨‍💻',
    name: '開発者',
    role: 'ADHD当事者',
    content:
      '自分で作ったアプリだけど、実際に毎日使っています。絵文字1つでいいというルールが、本当に続けられる秘訣でした。',
    highlight: true,
  },
  {
    avatar: '🙋‍♀️',
    name: 'ユーザーA',
    role: '準備中',
    content: 'レビュー募集中...',
    placeholder: true,
  },
  {
    avatar: '🙋‍♂️',
    name: 'ユーザーB',
    role: '準備中',
    content: 'レビュー募集中...',
    placeholder: true,
  },
]

export function SocialProofSection() {
  return (
    <section className="section-gradient-subtle px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2>
            使っている人の
            <span className="gradient-text">声</span>
          </h2>
          <p>実際に使っている人の体験</p>
        </div>

        {/* 統計カード */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 開発者の継続日数 */}
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="mb-2 flex justify-center">
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mb-1 text-4xl font-bold text-foreground">
              {stats.developerStreak}
              <span className="text-lg text-muted-foreground">日</span>
            </div>
            <p className="text-sm text-muted-foreground">開発者の継続記録</p>
          </div>

          {/* 総ユーザー数（将来） */}
          <div className="glass-card rounded-2xl p-6 text-center opacity-60">
            <div className="mb-2 flex justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="mb-1 text-4xl font-bold text-foreground">
              {stats.totalUsers}
            </div>
            <p className="text-sm text-muted-foreground">記録を続けている人（準備中）</p>
          </div>

          {/* 説明カード */}
          <div className="glass-card flex items-center justify-center rounded-2xl p-6 sm:col-span-2 lg:col-span-1">
            <p className="text-center text-sm text-muted-foreground">
              サービス開始後、
              <br />
              ユーザーの声を追加予定です
            </p>
          </div>
        </div>

        {/* テスティモニアル */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`glass-card relative rounded-2xl p-6 ${
                testimonial.placeholder ? 'opacity-40' : ''
              } ${testimonial.highlight ? 'ring-2 ring-primary/20' : ''}`}
            >
              {/* 引用マーク */}
              <Quote className="absolute right-4 top-4 h-6 w-6 text-primary/20" />

              {/* アバターと名前 */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>

              {/* レビュー内容 */}
              <p
                className={`text-sm leading-relaxed ${
                  testimonial.placeholder
                    ? 'italic text-muted-foreground'
                    : 'text-foreground'
                }`}
              >
                {testimonial.content}
              </p>

              {/* ハイライトバッジ */}
              {testimonial.highlight && (
                <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Flame className="h-3 w-3" />
                  <span>実際に使用中</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 呼びかけ */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            あなたも体験談を共有しませんか？
            <br />
            アプリ内のフィードバック機能からお送りください。
          </p>
        </div>
      </div>
    </section>
  )
}
