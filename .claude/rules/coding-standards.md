---
paths: src/**/*.{ts,tsx}
---

# TypeScript コーディング規約

## 基本ルール

- **strictモード必須**: tsconfig.jsonで`strict: true`
- **any型禁止**: 明示的な型定義を使用
- **インターフェース推奨**: 型定義には`interface`を優先

```typescript
// 良い例
interface Entry {
  id: string
  userId: string
  content: string
  imageUrl: string | null
  createdAt: Date
}

// 避ける例
type Entry = { ... }  // interfaceを優先
const data: any = {}  // any禁止
```

## ファイル命名規則

| 対象 | 命名規則 | 例 |
|------|---------|------|
| コンポーネント | kebab-case | `entry-card.tsx`, `footer-nav.tsx` |
| ビジネスロジック | kebab-case | `service.ts`, `draft-storage.ts` |
| フック | kebab-case, `use-`プレフィックス | `use-timeline.ts` |
| 型定義 | kebab-case | `types.ts`, `database.ts` |
| ディレクトリ | kebab-case | `entry-input/`, `notification/` |

## バレルファイル禁止

Viteのツリーシェーキングを妨げるため、`index.ts`は使用しない。

```typescript
// 良い例: 直接インポート
import { createEntry } from '@/features/entry/api/service'

// 避ける例: バレルファイル経由
import { createEntry } from '@/features/entry'
```

## 関数命名

動詞 + 名詞 のパターン:

```typescript
function calculateStreak(entries: Entry[]): number { ... }
function consumeHotsure(userId: string): Promise<void> { ... }
function formatEntryDate(date: Date): string { ... }
```

## インポート順序

```typescript
// 1. 外部ライブラリ
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 2. 内部モジュール（絶対パス）
import { EntryCard } from '@/components/entry/entry-card'
import { calculateStreak } from '@/lib/streak'
import type { Entry } from '@/lib/types'

// 3. 相対インポート（同一機能内のみ）
import { useEntryForm } from './hooks'
```

## Result型（Railway Oriented Programming）

```typescript
// Server Actions での使用
export async function myAction(): Promise<Result<Data, AppError>> {
  if (!valid) return err({ code: 'INVALID_INPUT', message: '...' })
  return ok(data)
}

// 呼び出し側
const result = await myAction()
if (isOk(result)) {
  // result.value にアクセス
}
```

- `Result<T, E>` は Server Actions で必須
- `isOk()` / `isError()` でパターンマッチ
