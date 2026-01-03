---
paths: src/**/*.tsx
---

# React パターン規約

## Server Components vs Client Components

**デフォルトはServer Component**（`'use client'`なし）

```typescript
// Server Component（デフォルト）
// app/page.tsx
export default async function Timeline() {
  const entries = await fetchEntries()  // サーバーで実行
  return <TimelineView entries={entries} />
}

// Client Component（インタラクティブな部分のみ）
// components/entry/entry-form.tsx
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
