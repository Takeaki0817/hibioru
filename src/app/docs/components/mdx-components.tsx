import type { MDXComponents } from 'mdx/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Link, Info, AlertTriangle, CheckCircle, HelpCircle, ChevronDown } from 'lucide-react'

/**
 * MDXカスタムコンポーネント
 * MDXファイル内で使用可能なコンポーネントを定義
 */

// 見出しテキストからslugを生成（VitePress風）
function generateSlug(children: React.ReactNode): string {
  const text = typeof children === 'string'
    ? children
    : Array.isArray(children)
      ? children.map(child => typeof child === 'string' ? child : '').join('')
      : ''
  // 日本語対応: スペースをハイフンに、特殊文字を除去
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
}

// アンカーリンク付き見出しコンポーネント
interface HeadingProps {
  level: 'h1' | 'h2' | 'h3'
  children: React.ReactNode
  className: string
}

function HeadingWithAnchor({ level, children, className }: HeadingProps) {
  const Tag = level
  const id = generateSlug(children)

  return (
    <Tag id={id} className={cn(className, 'group scroll-mt-20')}>
      {children}
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
        aria-label={`${children}へのリンク`}
      >
        <Link className="inline size-4" />
      </a>
    </Tag>
  )
}

// 読む時間表示
interface ReadTimeProps {
  minutes: number
}

export function ReadTime({ minutes }: ReadTimeProps) {
  return (
    <div className="mb-6 text-sm text-muted-foreground">
      読む時間: 約{minutes}分
    </div>
  )
}

// ヒント・ポイント表示（Notion風コールアウト）
interface TipProps {
  children: React.ReactNode
  type?: 'info' | 'warning' | 'success'
}

const tipConfig = {
  info: {
    icon: Info,
    label: 'ポイント',
    styles: 'bg-primary/10 border-primary/30',
    iconColor: 'text-primary',
  },
  warning: {
    icon: AlertTriangle,
    label: '注意',
    styles: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-500',
  },
  success: {
    icon: CheckCircle,
    label: 'おすすめ',
    styles: 'bg-emerald-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-500',
  },
} as const

export function Tip({ children, type = 'info' }: TipProps) {
  const config = tipConfig[type]
  const Icon = config.icon

  return (
    <div className={cn('rounded-lg border p-4 my-4', config.styles)}>
      <div className={cn('flex items-center gap-2 font-medium', config.iconColor)}>
        <Icon className="size-5 shrink-0" />
        {config.label}
      </div>
      <div className="mt-2 text-sm text-muted-foreground pl-7">{children}</div>
    </div>
  )
}

// ガイドステップ
interface GuideStepProps {
  number: number
  children: React.ReactNode
}

export function GuideStep({ number, children }: GuideStepProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {number}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

// セクションカード
interface SectionCardProps {
  title: string
  children: React.ReactNode
  variant?: 'default' | 'highlight'
}

export function SectionCard({
  title,
  children,
  variant = 'default',
}: SectionCardProps) {
  return (
    <Card className={cn(variant === 'highlight' && 'border-primary/50 bg-primary/5')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// 用語説明（折りたたみ式定義リスト）- クリック領域を改善
interface GlossaryItemProps {
  term: string
  emoji: string
  children: React.ReactNode
}

export function GlossaryItem({ term, emoji, children }: GlossaryItemProps) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors rounded-lg">
        <span className="text-xl shrink-0">{emoji}</span>
        <span className="flex-1 font-medium text-foreground">{term}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pl-14 text-sm text-muted-foreground">
        {children}
      </div>
    </details>
  )
}

// 用語カード（カードグリッド形式）
interface GlossaryCardProps {
  term: string
  emoji: string
  children: React.ReactNode
}

export function GlossaryCard({ term, emoji, children }: GlossaryCardProps) {
  return (
    <div className="group rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{emoji}</span>
        <h3 className="font-bold text-foreground">{term}</h3>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}

// FAQ項目（アニメーション付きアコーディオン）
interface FAQItemProps {
  question: string
  children: React.ReactNode
}

export function FAQItem({ question, children }: FAQItemProps) {
  return (
    <details className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 my-3">
      <summary className="cursor-pointer list-none flex items-center gap-3">
        <HelpCircle className="size-5 shrink-0 text-primary" />
        <span className="flex-1 font-medium text-foreground">{question}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-4 pl-8 text-sm text-muted-foreground border-l-2 border-primary/20">
        {children}
      </div>
    </details>
  )
}

// バージョンバッジ
interface VersionBadgeProps {
  version: string
  type: 'major' | 'minor' | 'patch'
}

export function VersionBadge({ version, type }: VersionBadgeProps) {
  const styles = {
    major: 'bg-destructive/20 text-destructive',
    minor: 'bg-primary/20 text-primary',
    patch: 'bg-muted text-muted-foreground',
  }

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[type])}>
      v{version}
    </span>
  )
}

// ロードマップステータス
interface RoadmapStatusProps {
  status: 'completed' | 'in-progress' | 'planned' | 'considering'
}

export function RoadmapStatus({ status }: RoadmapStatusProps) {
  const styles = {
    completed: { label: '完了', color: 'bg-success/20 text-success', icon: '✓' },
    'in-progress': { label: '進行中', color: 'bg-primary/20 text-primary', icon: '→' },
    planned: { label: '予定', color: 'bg-accent/20 text-accent-foreground', icon: '○' },
    considering: { label: '検討中', color: 'bg-muted text-muted-foreground', icon: '?' },
  }

  const { label, color, icon } = styles[status]

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

/**
 * MDXコンポーネントのマッピング
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // 標準要素のカスタマイズ（アンカーリンク付き見出し）
    h1: ({ children }) => (
      <HeadingWithAnchor level="h1" className="mb-6 mt-0 text-2xl font-bold">
        {children}
      </HeadingWithAnchor>
    ),
    h2: ({ children }) => (
      <HeadingWithAnchor level="h2" className="mb-4 mt-8 text-xl font-bold border-b border-border/50 pb-2">
        {children}
      </HeadingWithAnchor>
    ),
    h3: ({ children }) => (
      <HeadingWithAnchor level="h3" className="mb-3 mt-6 text-lg font-bold">
        {children}
      </HeadingWithAnchor>
    ),
    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>,
    ol: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-2">{children}</ol>,
    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{children}</code>
    ),
    // カスタムコンポーネント
    ReadTime,
    Tip,
    GuideStep,
    SectionCard,
    GlossaryItem,
    GlossaryCard,
    FAQItem,
    VersionBadge,
    RoadmapStatus,
    ...components,
  }
}
