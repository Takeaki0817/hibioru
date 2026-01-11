---
paths: src/app/**, src/**/*.tsx
---

# React & Next.js パターン規約

## Server Components vs Client Components

**デフォルトはServer Component**（`'use client'`なし）

### 'use client' は必要な場合のみ

以下の場合のみClient Component:
- useState, useEffect等のReact Hooks使用
- イベントハンドラ（onClick等）
- framer-motion等のクライアントライブラリ
- ブラウザAPI使用

```typescript
// Server Component（デフォルト）- JSバンドルに含まれない
export default async function Timeline() {
  const entries = await fetchEntries()  // サーバーで実行
  return <TimelineView entries={entries} />
}

// Client Component（インタラクティブな部分のみ）
'use client'
export function EntryForm() { ... }
```

### 使い分けガイド

| Server Component | Client Component |
|-----------------|------------------|
| データフェッチ | ユーザー入力 |
| 静的表示 | 状態管理（useState） |
| SEO重要なコンテンツ | イベントハンドラ |
| 認証チェック | アニメーション |

---

## dynamic exportは避ける

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

### 動的レンダリングのトリガー

以下を使用すると自動的に動的:
- `cookies()`
- `headers()`
- `searchParams`
- Supabase `createClient()` (内部でcookies使用)

---

## useEffect内での非同期処理

### ESLint set-state-in-effect 対策

useEffect内で直接setStateを呼ぶと、カスケードレンダーを引き起こす。

```typescript
// ❌ 悪い例: ESLintエラー（set-state-in-effect）
function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)  // ← NG: 直接setState
    fetchUsers().then((data) => {
      setUsers(data)
      setIsLoading(false)
    })
  }, [])
}

// ✅ 良い例: 非同期関数を内部で定義
function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      const result = await fetchUsers()
      if (!isMounted) return  // アンマウント後の更新を防止

      if (result.ok) {
        setUsers(result.value)
      }
      setIsLoading(false)
    }

    fetchData()
    return () => { isMounted = false }
  }, [])
}
```

### ページネーションと初回フェッチの分離

```typescript
function PaginatedList() {
  const [items, setItems] = useState<Item[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // ページネーション用（明示的なカーソル引数）
  const loadMore = useCallback(async (cursor: string) => {
    const result = await fetchItems(cursor)
    if (result.ok) {
      setItems((prev) => [...prev, ...result.value.items])
      setNextCursor(result.value.nextCursor)
    }
  }, [])

  // 初回フェッチ用（useEffect + クリーンアップ）
  useEffect(() => {
    let isMounted = true
    const fetchInitial = async () => {
      const result = await fetchItems()
      if (!isMounted) return
      if (result.ok) {
        setItems(result.value.items)
        setNextCursor(result.value.nextCursor)
      }
    }
    fetchInitial()
    return () => { isMounted = false }
  }, [])

  // リトライ用（useCallback）
  const retryFetch = useCallback(() => {
    fetchItems().then((result) => {
      if (result.ok) {
        setItems(result.value.items)
        setNextCursor(result.value.nextCursor)
      }
    })
  }, [])
}
```

---

## 状態管理: Zustand

Props Drillingを避け、Zustandストアを使用。

```typescript
// stores/timeline-store.ts
import { create } from 'zustand'

interface TimelineState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

export const useTimelineStore = create<TimelineState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}))
```

ストアは各フィーチャーの`stores/`ディレクトリに配置。

---

## データフェッチパターン

### Server Componentでの直接fetch

```typescript
// app/page.tsx
const { data: entries } = await supabase
  .from('entries')
  .select('*')
  .order('created_at', { ascending: false })
```

### Client ComponentでのTanStack Query

```typescript
'use client'
import { useQuery } from '@tanstack/react-query'

function Timeline() {
  const { data, isLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: fetchEntries,
  })
  // ...
}
```

---

## Server Actions

機密処理はServer Actionsで実行。

```typescript
// features/entry/api/service.ts
'use server'

export async function createEntry(formData: FormData) {
  const supabase = await createClient()
  // 認証チェック、データ保存
}
```

---

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

---

## React Compiler

Next.js 16 で React Compiler が有効。

### 注意点

- 明示的な `useMemo`/`useCallback` は依然として有効
- 以下のケースでは明示的なメモ化を継続:
  - 複数の連続した計算の統合
  - `toLocaleTimeString` 等の重い処理
  - IntersectionObserver/MutationObserver コールバック
  - map内の複雑なロジックを持つ子コンポーネント

→ 詳細: `.claude/rules/refactoring.md`

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

### 推奨ワークフロー

1. **エラー調査時**: `nextjs_index` → `nextjs_call` でランタイムエラー取得
2. **API確認時**: `nextjs_docs` で最新ドキュメント参照
3. **ページ検証時**: `browser_eval` でブラウザ実行・コンソール確認
