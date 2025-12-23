'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

// アプリケーション用のトースト通知コンポーネント
// 失敗時のエラー通知などに使用
export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            'group toast group flex gap-2 items-center bg-background text-foreground border-border shadow-lg rounded-lg p-4',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
          actionButton:
            'inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3',
          cancelButton:
            'inline-flex items-center justify-center rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/90 h-8 px-3',
          error: 'border-destructive/50 bg-destructive/10',
          success: 'border-primary/50 bg-primary/10',
        },
      }}
      {...props}
    />
  )
}
