'use client'

import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { DocsMobileNav } from './docs-mobile-nav'

/**
 * ドキュメントページのヘッダー
 * ロゴ、モバイルナビ、ログインボタンを表示
 */
export function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* モバイルナビゲーション */}
          <DocsMobileNav />
          <Link href="/docs" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              ドキュメント
            </span>
          </Link>
        </div>
        <Button variant="default" size="sm" asChild>
          <Link href="/login">
            <LogIn className="mr-1.5 size-4" />
            ログイン
          </Link>
        </Button>
      </div>
    </header>
  )
}
