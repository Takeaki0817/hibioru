'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DOCS_NAV } from '../config/navigation'

/**
 * デスクトップ用サイドバーナビゲーション
 */
export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="py-8 pr-4">
      <div className="mb-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          ドキュメント
        </p>
      </div>
      <ul className="space-y-1">
        {DOCS_NAV.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
