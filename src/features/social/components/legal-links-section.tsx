import Link from 'next/link'
import { FileText, Shield } from 'lucide-react'

/**
 * 法的文書へのリンクセクション
 * 設定タブで利用規約とプライバシーポリシーへのアクセスを提供
 */
export function LegalLinksSection() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">法的情報</h3>
      <div className="space-y-2">
        <Link
          href="/docs/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">利用規約</span>
        </Link>
        <Link
          href="/docs/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">プライバシーポリシー</span>
        </Link>
      </div>
    </div>
  )
}
