---
globs: next.config.ts, src/app/**/page.tsx, src/app/**/layout.tsx
---

# パフォーマンス目標

## Core Web Vitals 目標

| 指標 | 目標 | 測定 |
|------|------|------|
| **LCP** | < 2.5s | 最大コンテンツ描画 |
| **FID** | < 100ms | 初回入力遅延 |
| **CLS** | < 0.1 | 累積レイアウトシフト |
| **INP** | < 200ms | 次の描画までの時間 |

## バンドルサイズ目標

| チャンク | 目標 | 現状確認 |
|---------|------|---------|
| First Load JS | < 100KB | `pnpm build` 出力確認 |
| 個別ページ | < 50KB | Route別サイズ確認 |

## 最適化パターン

### Server Components優先
```typescript
// ❌ 不要な 'use client'
'use client'
export default function StaticPage() { ... }

// ✅ Server Component
export default function StaticPage() { ... }
```

### 画像最適化
```typescript
import Image from 'next/image'

// ✅ 必須属性
<Image src={url} alt="説明" width={100} height={100} />

// ✅ 優先読み込み（ATF）
<Image priority src={heroImage} ... />
```

### 動的インポート
```typescript
// 重いコンポーネントは動的読み込み
const RiveAnimation = dynamic(() => import('@rive-app/react-canvas'), {
  ssr: false,
  loading: () => <Skeleton />
})
```

### パッケージ最適化（next.config.ts設定済み）
- lucide-react: アイコン個別インポート
- date-fns: 関数個別インポート
- framer-motion: 使用機能のみ

## 確認コマンド

```bash
# バンドル分析
pnpm build && npx @next/bundle-analyzer

# Lighthouse
npx lighthouse https://hibioru.app --view
```

## 禁止パターン

- `export const dynamic = 'force-dynamic'`
- `select('*')` による全カラム取得
- クライアントでの重い計算（JST変換等はサーバーで）
