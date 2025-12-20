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
            // デフォルトのstale時間（データが新鮮な状態を保つ時間）
            staleTime: 5 * 60 * 1000, // 5分
            // キャッシュの保持時間（GC対象になるまでの時間）
            gcTime: 5 * 60 * 1000, // 5分
            // リトライ設定
            retry: 1,
            // リフェッチ設定
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
