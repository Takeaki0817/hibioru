import {
  BookOpen,
  FileText,
  HelpCircle,
  History,
  Home,
  Rocket,
  Shield,
  Sparkles,
} from 'lucide-react'

/**
 * ドキュメントナビゲーション設定
 */
export const DOCS_NAV = [
  { href: '/docs', label: 'はじめに', icon: Home },
  { href: '/docs/guide', label: '使い方', icon: BookOpen },
  { href: '/docs/glossary', label: '用語', icon: Sparkles },
  { href: '/docs/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/docs/privacy', label: 'プライバシー', icon: Shield },
  { href: '/docs/terms', label: '利用規約', icon: FileText },
  { href: '/docs/changelog', label: '更新履歴', icon: History },
  { href: '/docs/roadmap', label: 'ロードマップ', icon: Rocket },
] as const

export type DocsNavItem = (typeof DOCS_NAV)[number]
