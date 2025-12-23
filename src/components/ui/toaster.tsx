'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'

// sonnerのToasterラッパー
// テーマに連動し、アプリのスタイルに合わせた設定
export function Toaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="top-center"
      toastOptions={{
        // ADHD向け: 控えめで穏やかなスタイル
        classNames: {
          toast: 'font-sans shadow-lg',
          title: 'font-medium',
          description: 'text-sm',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
        // 表示時間（エラーは長め）
        duration: 4000,
      }}
      // 成功時は3秒で消える
      richColors
      closeButton
    />
  )
}
