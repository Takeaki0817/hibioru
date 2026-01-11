import { FooterNav } from '@/components/layouts/footer-nav'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  /** ヘッダーコンポーネント */
  header?: React.ReactNode
  /** メインコンテンツ */
  children: React.ReactNode
  /** フッター（デフォルト: FooterNav） */
  footer?: React.ReactNode
  /** mainタグに適用するクラス */
  mainClassName?: string
  /** mainタグでラップするかどうか（デフォルト: true） */
  wrapWithMain?: boolean
}

/**
 * 共通ページレイアウト
 * ヘッダー + メインコンテンツ + フッターの構成を提供
 */
export function PageLayout({
  header,
  children,
  footer,
  mainClassName,
  wrapWithMain = true,
}: PageLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {header}

      {wrapWithMain ? (
        <main id="main-content" className={cn('flex-1 overflow-auto', mainClassName)}>
          {children}
        </main>
      ) : (
        children
      )}

      {footer !== undefined ? footer : <FooterNav />}
    </div>
  )
}
