'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// TanStack Query用のプロバイダー
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データが新鮮な状態を保つ時間（この間は再フェッチしない）
            staleTime: 5 * 60 * 1000, // 5分
            // キャッシュの保持時間（staleTimeより長く設定してキャッシュ効率を向上）
            gcTime: 30 * 60 * 1000, // 30分
            // リトライ設定
            retry: 1,
            // リフェッチ設定（バックグラウンド復帰時の不要なリクエストを防止）
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
