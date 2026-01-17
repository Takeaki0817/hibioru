---
globs: src/**/api/**/*.ts, supabase/**/*
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

## RLSポリシー規約

### auth.uid() の最適化

RLSポリシーでは必ず `(select auth.uid())` パターンを使用する。

```sql
-- ❌ 非効率（各行ごとに再評価される）
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ 効率的（クエリごとに1回のみ評価）
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING ((select auth.uid()) = user_id);
```

### 複数ポリシーの統合

同じテーブル・ロール・アクションに対して複数のpermissiveポリシーを作らない。OR条件で1つに統合する。

```sql
-- ❌ 非効率（両方のポリシーが毎回評価される）
CREATE POLICY "Users can view own" ON entries FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view following" ON entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM follows WHERE ...));

-- ✅ 効率的（1つのポリシーに統合）
CREATE POLICY "Users can view entries" ON entries FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (SELECT 1 FROM follows WHERE follower_id = (select auth.uid()) ...)
  );
```

### Service roleポリシーのロール指定

Service role用ポリシーは `TO service_role` を使用して明示的にロールを指定する。
`USING ((select auth.role()) = 'service_role')` は `public` ロールに適用されるため、Userポリシーと重複警告が発生する。

```sql
-- ❌ 警告が発生（publicロールに適用されUserポリシーと重複）
CREATE POLICY "Service role can manage"
  ON table_name FOR ALL
  USING ((select auth.role()) = 'service_role');

-- ✅ 正しい（service_roleロールに直接適用）
CREATE POLICY "Service role can manage"
  ON table_name FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Userポリシーのロール指定

認証済みユーザー向けポリシーは `TO authenticated` を明示的に指定する。

```sql
-- 推奨（ロールを明示）
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
```

### Security Advisor

定期的に Security Advisor を確認し、警告に対応する。

```bash
# パフォーマンス警告の確認
mcp__supabase__get_advisors --type performance

# セキュリティ警告の確認
mcp__supabase__get_advisors --type security
```

## Edge Functions

配置: `supabase/functions/`

プッシュ通知のスケジュール実行などに使用。
