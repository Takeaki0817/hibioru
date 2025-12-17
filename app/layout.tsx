import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ヒビオル - 日々を織る',
  description: 'ADHD当事者のための瞬間記録アプリ',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  )
}
