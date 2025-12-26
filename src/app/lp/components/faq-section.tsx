'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={onClick}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/30"
      >
        <span className="font-medium text-card-foreground">{question}</span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="border-t px-5 pb-5 pt-4">
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'βテスト版とは何ですか？',
      answer:
        '正式リリース前のテスト版です。βテスト中のため、予告なく仕様が変更される場合があります。不具合が発生した場合はフィードバックからご連絡ください。',
    },
    {
      question: '記録したデータはどこに保存されますか？',
      answer:
        'データはクラウド（Supabase）に保存されます。万が一に備え、定期的にデータエクスポートをおすすめします。マイページからJSON/Markdown形式でエクスポートできます。',
    },
    {
      question: 'プライバシーは守られますか？',
      answer:
        '記録内容は本人以外には公開されません。開発者がデータを閲覧することはありません。安心してご利用ください。',
    },
    {
      question: 'PWAとは何ですか？インストールは必要ですか？',
      answer:
        'PWA（Progressive Web App）は、Webブラウザから利用できるアプリです。アプリのインストールは不要ですが、ホーム画面に追加することでアプリのように使用できます。',
    },
    {
      question: 'どのデバイスから使えますか？',
      answer:
        'スマートフォン、タブレット、PCなど、Webブラウザがあるデバイスならどこからでもアクセスできます。データはデバイス間で自動同期されます。',
    },
    {
      question: 'ほつれはいつ補充されますか？',
      answer:
        'ほつれは毎週月曜日の0:00に2回分補充されます。繰り越しはできません。使い切った状態で記録がない日があると、継続記録がリセットされます。',
    },
    {
      question: '通知が届かない場合はどうすればいいですか？',
      answer:
        'マイページで通知機能がオンになっているか確認してください。また、ブラウザの通知許可設定もご確認ください。それでも届かない場合はフィードバックからご連絡ください。',
    },
    {
      question: '投稿や画像に制限はありますか？',
      answer:
        'βテスト版では、1日あたり投稿20件まで、画像5枚までの制限があります。また、1つの投稿に添付できる画像は最大2枚です。制限は毎日0:00（JST）にリセットされます。',
    },
    {
      question: '記録を編集・削除できますか？',
      answer:
        '記録の編集は作成から24時間以内のみ可能です。タイムラインで記録をタップすると編集画面に移動します。24時間を過ぎた記録は編集できませんのでご注意ください。削除は編集画面から行えます。',
    },
    {
      question: 'アカウントを削除したい場合は？',
      answer:
        'マイページの「アカウント削除」から削除できます。確認のため「delete」と入力する必要があります。削除すると、すべての記録・画像・設定が完全に削除され、復元できません。',
    },
    {
      question: 'フィードバックはどこから送れますか？',
      answer:
        'ログイン後、マイページの「フィードバックを送る」ボタンからGoogleフォームにアクセスできます。ご意見・ご感想をお待ちしております。',
    },
  ]

  const notices = [
    {
      title: 'なぜこのアプリを作ったのか',
      content:
        '開発者自身がADHDの気質により、日記やログを何度も挫折してきました。「書かなきゃ」と思っても、いざ開くと書けない。気づいたら数日空いて、やる気がなくなる。何も成果がない日や落ち込んだときなど、記録に残したくないときに止まってしまう。この経験から、続けやすさに特化したアプリを作りました。',
    },
  ]

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* FAQ */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              よくある質問
            </h2>
          </div>

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
        </div>

        {/* 注意事項 */}
        <div>
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              開発者からのメッセージ
            </h2>
          </div>

          <div className="space-y-6">
            {notices.map((notice, index) => (
              <div
                key={index}
                className="rounded-lg border bg-card p-6 shadow-sm"
              >
                <h3 className="mb-3 text-lg font-semibold text-card-foreground">
                  {notice.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {notice.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="mt-16 border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 ヒビオル. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  )
}
