'use client'

import { Logo } from '@/components/brand/logo'

/**
 * ソーシャルページのヘッダー
 * ロゴ + タイトルを両端寄せで表示
 */
export function SocialHeader() {
  return (
    <header className="border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-400 items-center justify-between px-2.5 md:px-4">
        {/* 左: ロゴ */}
        <h1 className="text-foreground">
          <Logo size="sm" />
          <span className="sr-only">ヒビオル</span>
        </h1>

        {/* 右: タイトル */}
        <span className="text-lg font-bold">ソーシャル</span>
      </div>
    </header>
  )
}
