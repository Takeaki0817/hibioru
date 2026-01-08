import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { DocsHeader } from './components/docs-header'
import { DocsSidebar } from './components/docs-sidebar'
import { TableOfContents, MobileTableOfContents } from './components/table-of-contents'
import { DocsBreadcrumb } from './components/docs-breadcrumb'
import { DocsPagination } from './components/docs-pagination'
import './docs.css'

const mPlusRounded1c = M_PLUS_Rounded_1c({
  variable: '--font-m-plus-rounded-1c',
  weight: ['500', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: {
    template: '%s - ヒビオル ドキュメント',
    default: 'ドキュメント - ヒビオル',
  },
  description:
    'ヒビオルの使い方、用語説明、FAQ、プライバシーポリシー、更新ログ、ロードマップなど',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${mPlusRounded1c.variable} font-sans`}>
      <ThemeProvider>
        <div className="docs-page min-h-screen bg-background">
          {/* Skip Link - アクセシビリティ: キーボードユーザー向け */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            メインコンテンツへスキップ
          </a>
          <DocsHeader />
          <div className="mx-auto flex max-w-7xl items-start">
            {/* 左サイドバー - ナビゲーション（sticky固定） */}
            <aside className="hidden lg:block lg:w-56 lg:shrink-0 lg:border-r lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
              <DocsSidebar />
            </aside>

            {/* コンテンツエリア */}
            <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
              <article className="prose-sage mx-auto max-w-3xl">
                {/* パンくずリスト */}
                <DocsBreadcrumb />
                {/* モバイル用折りたたみ目次 */}
                <MobileTableOfContents />
                {/* ページコンテンツ */}
                {children}
                {/* ページ間ナビゲーション */}
                <DocsPagination />
              </article>
            </main>

            {/* 右サイドバー - 目次（xl以上で表示、sticky固定） */}
            <aside className="hidden xl:block xl:w-56 xl:shrink-0 xl:border-l xl:sticky xl:top-14 xl:self-start xl:max-h-[calc(100vh-3.5rem)] xl:overflow-y-auto">
              <TableOfContents />
            </aside>
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}
