import Image from 'next/image'
import { Plus, Send, Check } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Plus,
    title: 'タップ',
    description: '「+」ボタンを押す',
  },
  {
    number: 2,
    icon: Send,
    title: '入力',
    description: '絵文字でも一言でもOK',
  },
  {
    number: 3,
    icon: Check,
    title: '完了',
    description: 'タイムラインに追加',
  },
]

export function DemoSection() {
  return (
    <section className="section-gradient-subtle px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <h2>
            <span className="gradient-text">2タップ</span>で、こんなに簡単。
          </h2>
          <p>思いついた瞬間に、すぐ記録</p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* 左側: ステップ説明 */}
          <div>
            {/* ステップカード */}
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  {/* ステップ番号 */}
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                      <step.icon className="h-6 w-6" />
                    </div>
                    {/* 接続線 */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-1/2 top-14 h-6 w-0.5 -translate-x-1/2 bg-primary/20" />
                    )}
                  </div>

                  {/* テキスト */}
                  <div className="pt-2">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">
                        Step {step.number}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {step.title}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 補足メッセージ */}
            <div className="mt-8 rounded-xl bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">ポイント：</span>
                完璧な文章を書く必要はありません。
                <br />
                「😊」「☕️」「疲れた」— それだけで十分です。
              </p>
            </div>
          </div>

          {/* 右側: スマホスクリーンショット */}
          <div className="flex justify-center lg:justify-end">
            <Image
              src="/lp/screenshot-demo-mock.png"
              alt="ヒビオルの入力画面 - 絵文字候補と記録ボタン"
              width={280}
              height={560}
              className="drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
