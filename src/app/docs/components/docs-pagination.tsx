'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DOCS_NAV } from '../config/navigation'
import { cn } from '@/lib/utils'

/**
 * ページ間ナビゲーション（Docusaurus風）
 * 前へ/次へリンクをページ下部に表示
 */
export function DocsPagination() {
  const pathname = usePathname()
  const currentIndex = DOCS_NAV.findIndex((item) => item.href === pathname)

  if (currentIndex === -1) return null

  const prev = currentIndex > 0 ? DOCS_NAV[currentIndex - 1] : null
  const next = currentIndex < DOCS_NAV.length - 1 ? DOCS_NAV[currentIndex + 1] : null

  if (!prev && !next) return null

  return (
    <nav
      className="mt-12 pt-6 border-t border-border flex justify-between gap-4"
      aria-label="ページナビゲーション"
    >
      {/* 前へ */}
      {prev ? (
        <Link
          href={prev.href}
          className={cn(
            'group flex items-center gap-3 rounded-lg border border-border p-4 transition-all',
            'hover:border-primary/50 hover:bg-primary/5'
          )}
        >
          <ChevronLeft className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="text-left">
            <div className="text-xs text-muted-foreground mb-0.5">前へ</div>
            <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              <prev.icon className="size-4" />
              {prev.label}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {/* 次へ */}
      {next ? (
        <Link
          href={next.href}
          className={cn(
            'group flex items-center gap-3 rounded-lg border border-border p-4 transition-all ml-auto',
            'hover:border-primary/50 hover:bg-primary/5'
          )}
        >
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-0.5">次へ</div>
            <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              {next.label}
              <next.icon className="size-4" />
            </div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  )
}
