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
  title: 'ヒビオル - 「続かない」を終わりにする思考記録アプリ',
  description:
    'ADHDの開発者が20年の挫折を経て作った、絵文字1つから始められる記録アプリ。Duolingo式の継続支援で「続けること」に特化。完全無料、今すぐ始められます。',
  keywords: [
    'ヒビオル',
    '思考記録',
    '日記アプリ',
    'ADHD',
    '継続',
    'ストリーク',
    '筆記開示',
    '瞬間記録',
  ],
  openGraph: {
    title: 'ヒビオル - 「続かない」を終わりにする思考記録アプリ',
    description:
      'ADHDの開発者が20年の挫折を経て作った、絵文字1つから始められる記録アプリ。',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ヒビオル - ADHD当事者のための瞬間記録アプリ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ヒビオル - 「続かない」を終わりにする思考記録アプリ',
    description:
      'ADHDの開発者が20年の挫折を経て作った、絵文字1つから始められる記録アプリ。',
  },
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
