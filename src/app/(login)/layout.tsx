import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* ドキュメントリンク（右上固定） */}
      <nav className="fixed top-0 right-0 p-4 z-10">
        <Link
          href="/docs"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>ドキュメント</span>
        </Link>
      </nav>

      {children}
    </div>
  )
}
