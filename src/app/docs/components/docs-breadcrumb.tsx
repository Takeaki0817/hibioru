'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { DOCS_NAV } from '../config/navigation'

/**
 * パンくずリスト（Notion風）
 */
export function DocsBreadcrumb() {
  const pathname = usePathname()
  const currentPage = DOCS_NAV.find((item) => item.href === pathname)

  if (!currentPage) return null

  return (
    <nav aria-label="パンくずリスト" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href="/docs/guide"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="size-4" />
            <span className="sr-only">ドキュメント</span>
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="size-3 text-muted-foreground/50" />
        </li>
        <li className="flex items-center gap-1.5 text-foreground font-medium">
          <currentPage.icon className="size-4" />
          {currentPage.label}
        </li>
      </ol>
    </nav>
  )
}
