'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <button
        onClick={onClick}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-primary/5"
      >
        <span className="font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-primary transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/50 px-5 pb-5 pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const faqs = [
  {
    question: '本当に無料で使えますか？',
    answer:
      '基本機能は完全無料でご利用いただけます。将来的にプレミアム機能を追加する可能性はありますが、記録・継続・振り返りの基本機能は無料のまま提供し続けます。',
  },
  {
    question: 'データはどこに保存されますか？',
    answer:
      'データはクラウド（Supabase）に安全に保存されます。万が一に備え、定期的なデータエクスポートをおすすめします。ソーシャルページからJSON/Markdown形式でエクスポートできます。',
  },
  {
    question: 'プライバシーは守られますか？',
    answer:
      '記録内容は本人以外には公開されません。「共有」を選択した投稿のみ、フォロワーに公開されます。開発者がデータを閲覧することもありません。安心してご利用ください。',
  },
  {
    question: 'ほつれはいつ補充されますか？',
    answer:
      'ほつれは毎週月曜日の0:00（日本時間）に2回分補充されます。繰り越しはできません。使い切った状態で記録がない日があると、継続記録がリセットされます。',
  },
  {
    question: '通知が届かない場合は？',
    answer:
      'ソーシャルページで通知機能がオンになっているか確認してください。また、ブラウザの通知許可設定もご確認ください。それでも届かない場合は、フィードバック機能からご連絡ください。',
  },
  {
    question: '記録の編集・削除はできますか？',
    answer:
      '記録の編集は作成から24時間以内のみ可能です。タイムラインで記録をタップすると編集画面に移動します。削除は編集画面からいつでも行えます。',
  },
  {
    question: 'なぜDM機能がないのですか？',
    answer:
      'ADHDの方は返信義務感がストレスになりやすく、記録に集中できなくなる可能性があります。ヒビオルは「自分の記録」に集中できる環境を優先しているため、DM機能は意図的に実装していません。',
  },
  {
    question: 'なぜフォロワー数が非表示なのですか？',
    answer:
      'フォロワー数の比較は、報酬系を余分に刺激しストレスの原因になります。ヒビオルでは「継続」にのみ報酬を与える設計としているため、フォロワー数は本人にのみ表示し、他者には非公開としています。',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* 背景装飾 */}
      <div className="floating-orb floating-orb-primary animate-float-slow absolute -right-32 top-20 h-64 w-64" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* セクションヘッダー */}
        <div className="section-header">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <HelpCircle className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2>
            よくある
            <span className="gradient-text">質問</span>
          </h2>
        </div>

        {/* FAQリスト */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* 追加の質問への誘導 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            他にご質問がありましたら、アプリ内の
            <span className="font-medium text-foreground">フィードバック機能</span>
            からお問い合わせください。
          </p>
        </div>
      </div>
    </section>
  )
}
