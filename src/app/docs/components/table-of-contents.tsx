'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { List } from 'lucide-react'

interface TOCItem {
  id: string
  text: string
  level: number
}

/**
 * 目次コンポーネント（VitePress風）
 * - IntersectionObserverで現在位置をハイライト
 * - スムーススクロールでナビゲーション
 * - ページ遷移時に自動更新
 */
export function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const pathname = usePathname()

  // ページ内の見出しを取得（パス変更時にリセット）
  useEffect(() => {
    // DOM更新を待つ
    const timer = setTimeout(() => {
      const article = document.querySelector('article')
      if (!article) return

      const elements = article.querySelectorAll('h2, h3')
      const items: TOCItem[] = Array.from(elements)
        .map((el) => ({
          id: el.id,
          text: el.textContent?.replace(/#$/, '').trim() ?? '',
          level: el.tagName === 'H2' ? 2 : 3,
        }))
        .filter((item) => item.id && item.text) // 空のIDをフィルタ
      setHeadings(items)

      // 初期アクティブ設定
      if (items.length > 0) {
        setActiveId(items[0].id)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  // IntersectionObserverで現在位置を追跡
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  // 見出しがない場合は表示しない
  if (headings.length === 0) return null

  return (
    <nav aria-label="目次">
      <div className="py-6 pl-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <List className="size-4" />
          目次
        </h4>
        <ul className="space-y-2 text-sm">
          {headings.map((heading, index) => (
            <li
              key={`${heading.id}-${index}`}
              className={cn(
                heading.level === 3 && 'pl-3',
              )}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(heading.id)
                  element?.scrollIntoView({ behavior: 'smooth' })
                  setActiveId(heading.id)
                }}
                className={cn(
                  'block py-1 transition-colors duration-200 border-l-2 pl-3',
                  activeId === heading.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/**
 * モバイル用折りたたみTOC
 */
export function MobileTableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // ページ遷移時にリセット
  useEffect(() => {
    setIsOpen(false)

    const timer = setTimeout(() => {
      const article = document.querySelector('article')
      if (!article) return

      const elements = article.querySelectorAll('h2, h3')
      const items: TOCItem[] = Array.from(elements)
        .map((el) => ({
          id: el.id,
          text: el.textContent?.replace(/#$/, '').trim() ?? '',
          level: el.tagName === 'H2' ? 2 : 3,
        }))
        .filter((item) => item.id && item.text) // 空のIDをフィルタ
      setHeadings(items)
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  if (headings.length === 0) return null

  return (
    <details
      className="xl:hidden mb-6 rounded-lg border bg-card p-4"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none flex items-center gap-2 font-medium">
        <List className="size-4" />
        目次
        <span className={cn(
          'ml-auto transition-transform duration-200',
          isOpen && 'rotate-180'
        )}>
          ▼
        </span>
      </summary>
      <ul className="mt-3 space-y-1 text-sm border-l-2 border-border pl-3">
        {headings.map((heading, index) => (
          <li
            key={`${heading.id}-${index}`}
            className={cn(heading.level === 3 && 'pl-3')}
          >
            <a
              href={`#${heading.id}`}
              onClick={() => setIsOpen(false)}
              className="block py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
