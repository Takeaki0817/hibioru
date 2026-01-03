---
paths: src/**/api/**/*.ts, supabase/**/*
---

# Supabase 操作規約

## クライアント使い分け

### Server Component / Server Actions

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getEntries() {
  const supabase = await createClient()
  const { data } = await supabase.from('entries').select('*')
  return data
}
```

### Client Component

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

## 認証チェック

Server Actionsでは必ず認証チェックを行う。

```typescript
'use server'

export async function createEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // 処理続行
}
```

## マイグレーション規約

### 新規マイグレーション作成

```bash
pnpm db:migration:new add_new_column
```

### ファイル命名

`YYYYMMDDHHMMSS_description.sql` 形式（自動生成）

### 型定義更新

マイグレーション後は必ず型を再生成:

```bash
pnpm db:types
```

出力先: `src/lib/types/database.generated.ts`

## Edge Functions

配置: `supabase/functions/`

プッシュ通知のスケジュール実行などに使用。
