import type { Metadata } from 'next'
import { M_PLUS_1p } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './lp.css'

const mPlus1p = M_PLUS_1p({
  variable: '--font-m-plus-1p',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'ヒビオル - 日々を織る思考記録アプリ | βテスト参加募集',
  description:
    '1日の中での心の動きを記録する思考記録アプリ。絵文字1つから始められる、継続しやすい記録習慣。ADHD当事者が作った、続けることに特化したアプリです。',
}

export default function LPLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${mPlus1p.variable} font-sans`}>
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  )
}
