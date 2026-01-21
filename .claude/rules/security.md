---
globs: src/**/api/**/*.ts, src/**/actions/**/*.ts, src/features/**/api/**
---

# セキュリティ規約

## 基本原則

1. **認証チェック必須**: 全Server Actionsで `supabase.auth.getUser()` を使用
2. **エラー情報隠蔽**: 内部エラーの詳細をユーザーに露出しない
3. **入力検証必須**: 全ユーザー入力をバリデーション・サニタイズ
4. **ログの安全管理**: 本番環境でのconsole.error使用禁止

---

## エラーハンドリング

### 悪い例（内部情報露出）

```typescript
// NG: error.messageを直接ユーザーに返す
catch (error) {
  return {
    ok: false,
    error: {
      code: 'DB_ERROR',
      message: error instanceof Error ? error.message : '不明なエラー',
    },
  }
}
```

### 良い例（安全なエラー変換）

```typescript
import { logger } from '@/lib/logger'
import { createSafeError } from '@/lib/error-handler'

catch (error) {
  // 内部ログにのみ詳細を記録
  logger.error('処理失敗', error)

  // ユーザーには汎用メッセージのみ返す
  return {
    ok: false,
    error: createSafeError('DB_ERROR', error),
  }
}
```

### createSafeError の使い方

```typescript
// エラーコードのみ（内部エラーなし）
createSafeError('UNAUTHORIZED')

// 内部エラーあり（ログに記録）
createSafeError('DB_ERROR', error)
```

---

## ロギング

### 悪い例

```typescript
// NG: 本番環境でもconsole.errorが出力される
console.error('エラー:', error)
```

### 良い例

```typescript
import { logger } from '@/lib/logger'

// 開発環境のみコンソール出力、本番は抑制
logger.error('エラー:', error)
```

### logger の種類

```typescript
logger.error('エラーメッセージ', error)  // エラー
logger.warn('警告メッセージ', data)       // 警告
logger.info('情報メッセージ', data)       // 情報
logger.debug('デバッグメッセージ', data)  // デバッグ（開発のみ）
```

---

## 入力バリデーション

### ユーザー名（username）

```typescript
import { validateUsername } from '@/features/social/constants'

const validation = validateUsername(input.username)
if (!validation.valid) {
  return {
    ok: false,
    error: { code: 'INVALID_USERNAME', message: validation.error! },
  }
}
```

### 表示名（displayName）

```typescript
import { validateDisplayName, sanitizeDisplayName } from '@/features/social/constants'

// 1. バリデーション
const validation = validateDisplayName(input.displayName)
if (!validation.valid) {
  return {
    ok: false,
    error: { code: 'INVALID_DISPLAY_NAME', message: validation.error! },
  }
}

// 2. サニタイズして保存
const sanitized = sanitizeDisplayName(input.displayName)
```

### 禁止文字

| 項目 | 禁止文字 | 理由 |
|------|---------|------|
| displayName | `< > " ' &` | XSS防止 |
| displayName | `\x00-\x1F \x7F` | 制御文字 |
| username | 英数字とアンダースコア以外 | 一貫性 |

---

## SQL/ILIKE検索

### 悪い例

```typescript
// NG: ワイルドカード文字がそのまま使われる
.or(`username.ilike.%${searchTerm}%`)
```

### 良い例

```typescript
import { escapeIlikeWildcards } from '@/features/social/constants'

// %と_をエスケープ
const escapedTerm = escapeIlikeWildcards(searchTerm)
.or(`username.ilike.%${escapedTerm}%`)
```

---

## 認証パターン

### Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createSafeError } from '@/lib/error-handler'

export async function myAction(input: Input): Promise<SocialResult<Output>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    // 1. 認証チェック
    if (!userData.user) {
      return {
        ok: false,
        error: createSafeError('UNAUTHORIZED'),
      }
    }

    // 2. 入力バリデーション
    // ...

    // 3. ビジネスロジック
    // ...

  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}
```

---

## Admin Client 使用ルール

Admin Clientは**RLSをバイパス**するため、以下の条件を満たす場合のみ使用可能:

1. **認証済みユーザーのアクション後**のみ
2. **他ユーザーへの通知作成**など、RLS制約を超える必要がある場合

```typescript
// OK: 認証後に通知を作成
const { data: userData } = await supabase.auth.getUser()
if (!userData.user) return { ok: false, error: createSafeError('UNAUTHORIZED') }

// 認証済み → Admin Clientで通知作成
const adminClient = createAdminClient()
await adminClient.from('social_notifications').insert({
  user_id: targetUserId,
  from_user_id: userData.user.id,
  // ...
})
```

---

## 新機能追加時のチェックリスト

- [ ] 全Server Actionsに認証チェックを追加
- [ ] エラー返却に `createSafeError()` を使用
- [ ] ロギングに `logger` を使用（console.error禁止）
- [ ] ユーザー入力にバリデーション・サニタイズを適用
- [ ] ILIKE検索に `escapeIlikeWildcards()` を適用
- [ ] Admin Client使用時は認証後であることを確認

---

## 関連ファイル

| ファイル | 用途 |
|----------|------|
| `src/lib/logger.ts` | 条件付きロギング |
| `src/lib/error-handler.ts` | 安全なエラー変換 |
| `src/features/social/constants.ts` | バリデーション関数 |
| `src/features/social/types.ts` | SocialErrorコード定義 |
