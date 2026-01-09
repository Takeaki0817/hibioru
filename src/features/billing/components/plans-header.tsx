'use client'

import { Logo } from '@/components/brand/logo'

/**
 * プラン選択ページのヘッダー
 * SocialHeaderと同じ構成（ロゴ + タイトル両端寄せ）
 */
export function PlansHeader() {
  return (
    <header className="border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-20 max-w-3xl items-center justify-between px-2.5 md:px-4">
        {/* 左: ロゴ */}
        <h1 className="text-foreground">
          <Logo size="sm" />
          <span className="sr-only">ヒビオル</span>
        </h1>

        {/* 右: タイトル */}
        <span className="text-lg font-bold">プランを選択</span>
      </div>
    </header>
  )
}
