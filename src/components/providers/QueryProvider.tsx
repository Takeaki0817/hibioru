'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * TanStack Query用のプロバイダー
 *
 * 各クエリタイプに応じたstaleTime設定（個別フックで上書き推奨）:
 * - タイムライン: 10分（更新頻度低い）
 * - カレンダー: 5分（日次更新）
 * - 全日付データ: 5分（カルーセル用）
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // デフォルトのstaleTime（個別クエリで上書き可能）
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
