---
paths: src/app/**, src/components/**
---

# Next.js最適化規約

## Server Components vs Client Components

### 'use client' は必要な場合のみ

以下の場合のみClient Component:
- useState, useEffect等のReact Hooks使用
- イベントハンドラ（onClick等）
- framer-motion等のクライアントライブラリ
- ブラウザAPI使用

```typescript
// Server Component（デフォルト）- JSバンドルに含まれない
export function ProfileSection({ user }: Props) {
  return <div>{user.name}</div>
}

// Client Component - 必要な場合のみ
'use client'
export function AnimatedCard({ children }: Props) {
  return <motion.div animate={{ opacity: 1 }}>{children}</motion.div>
}
```

## API Routes

### dynamic exportは避ける

`createClient()` 使用で自動的に動的レンダリングされるため不要。
Cache Components有効時に競合エラーの原因になる。

```typescript
// 不要（削除する）
export const dynamic = 'force-dynamic'

// createClient()使用で自動的に動的
export async function GET() {
  const supabase = await createClient()
  // ...
}
```

## Cache Components（Next.js 16+）

### 有効化の前提条件

1. `next.config.ts` で `cacheComponents: true`
2. 動的データアクセスは `<Suspense>` でラップ
3. `dynamic = 'force-dynamic'` を使用しない

### 将来の有効化に向けて

現在はSuspense対応が必要なためコメントアウト。
主要ページのSuspense対応後に有効化予定。

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // cacheComponents: true, // Suspense対応後に有効化
}
```

## レンダリング戦略

### 静的 vs 動的の判断

| パターン | レンダリング | 例 |
|---------|------------|-----|
| 認証不要・データ固定 | 静的 | LP、ログイン画面 |
| 認証必要・ユーザーデータ | 動的 | タイムライン、ソーシャル |
| cookies/headers使用 | 動的 | 認証済みページ全般 |

### 動的レンダリングのトリガー

以下を使用すると自動的に動的:
- `cookies()`
- `headers()`
- `searchParams`
- Supabase `createClient()` (内部でcookies使用)

---

## next-devtools MCP

Next.js開発時は `next-devtools` MCPサーバーを活用する。

### 利用可能なツール

| ツール | 用途 |
|--------|------|
| `nextjs_index` | 開発サーバーの検出、利用可能なMCPツール一覧 |
| `nextjs_call` | エラー診断、ルート情報、キャッシュクリア等 |
| `nextjs_docs` | 公式ドキュメントの検索・取得 |
| `browser_eval` | ブラウザ自動化でページ検証 |
| `upgrade_nextjs_16` | Next.js 16へのアップグレードガイド |
| `enable_cache_components` | Cache Componentsの有効化サポート |

### 推奨ワークフロー

1. **エラー調査時**: `nextjs_index` → `nextjs_call` でランタイムエラー取得
2. **API確認時**: `nextjs_docs` で最新ドキュメント参照
3. **ページ検証時**: `browser_eval` でブラウザ実行・コンソール確認
4. **アップグレード時**: `upgrade_nextjs_16` でコードmod実行

### 使用例

```
# 開発サーバーのエラー確認
nextjs_index → nextjs_call(port=3000, toolName="get_errors")

# ドキュメント検索
nextjs_docs(action="search", query="cache components")
```
