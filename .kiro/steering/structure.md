# プロジェクト構造

## 組織方針

**App Router標準構成 + Feature-First**

Next.js App Routerの規約に従いつつ、機能単位でコードを整理する。
ルート直下のページと、再利用可能なコンポーネント・ロジックを分離。

---

## ディレクトリパターン

### アプリケーションルート (`/app`)
**配置**: Next.js App Routerのページ・レイアウト
**パターン**: ルートベースのフォルダ構成

```
/app
  /layout.tsx        # ルートレイアウト
  /page.tsx          # タイムライン/カレンダー（メイン）
  /login/page.tsx    # ログイン画面
  /new/page.tsx      # 新規入力
  /edit/[id]/page.tsx # 編集
  /mypage/page.tsx   # マイページ
  /api/              # API Routes
```

### コンポーネント (`/components`)
**配置**: 再利用可能なUIコンポーネント
**パターン**: 機能カテゴリ + 共通UI

```
/components
  /ui/              # 汎用UIプリミティブ（Button, Input, Modal等）
  /timeline/        # タイムライン関連
  /calendar/        # カレンダー関連
  /entry/           # 投稿カード、入力フォーム
  /streak/          # 継続記録表示
```

### ビジネスロジック (`/lib`)
**配置**: 純粋なロジック、ユーティリティ、型定義
**パターン**: ドメイン単位で分離

```
/lib
  /supabase/        # Supabaseクライアント、クエリ
  /streak/          # ストリーク計算ロジック
  /hotsure/         # ほつれ消費ロジック
  /notification/    # 通知関連
  /utils/           # 汎用ユーティリティ
  /types/           # 共通型定義
```

### Supabase関連 (`/supabase`)
**配置**: マイグレーション、シード、型生成
**パターン**: Supabase CLI標準

```
/supabase
  /migrations/      # DBマイグレーション
  /seed.sql         # シードデータ
```

---

## 命名規則

### ファイル名

| 種類 | パターン | 例 |
|------|----------|-----|
| コンポーネント | PascalCase | `EntryCard.tsx` |
| ページ | kebab-case (フォルダ) | `/app/edit/[id]/page.tsx` |
| ロジック・ユーティリティ | camelCase | `calculateStreak.ts` |
| 型定義 | camelCase | `types.ts` |
| 定数 | SCREAMING_SNAKE_CASE | `STREAK_RESET_HOUR` |

### コンポーネント名

```typescript
// ファイル名とexport名を一致させる
// EntryCard.tsx
export function EntryCard({ entry }: EntryCardProps) { ... }

// index.tsで再エクスポートする場合
// /components/entry/index.ts
export { EntryCard } from './EntryCard';
export { EntryForm } from './EntryForm';
```

### 関数名

```typescript
// 動詞 + 名詞 のパターン
function calculateStreak(entries: Entry[]): number { ... }
function consumeHotsure(userId: string): Promise<void> { ... }
function formatEntryDate(date: Date): string { ... }
```

---

## インポート構成

```typescript
// 1. 外部ライブラリ
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 2. 内部モジュール（絶対パス）
import { EntryCard } from '@/components/entry';
import { calculateStreak } from '@/lib/streak';
import type { Entry } from '@/lib/types';

// 3. 相対インポート（同一機能内のみ）
import { useEntryForm } from './hooks';
```

**パスエイリアス**:
- `@/`: プロジェクトルートにマップ

---

## コード構成原則

### Server Components vs Client Components

```typescript
// デフォルトはServer Component（'use client'なし）
// app/page.tsx
export default async function Timeline() {
  const entries = await fetchEntries(); // サーバーで実行
  return <TimelineView entries={entries} />;
}

// インタラクティブな部分のみClient Component
// components/entry/EntryForm.tsx
'use client';
export function EntryForm() { ... }
```

### データフェッチパターン

```typescript
// Server Componentで直接fetch
// app/page.tsx
const entries = await supabase
  .from('entries')
  .select('*')
  .order('created_at', { ascending: false });

// Client ComponentではuseEffect + useState または SWR/TanStack Query
```

### 依存関係ルール

- `/components` -> `/lib` を参照可
- `/lib` -> `/components` を参照不可（純粋ロジック）
- ページ -> 両方を参照可

---

## ドキュメント配置

```
/docs
  PROJECT.md        # プロジェクト背景、意思決定
  REQUIREMENTS.md   # 要件定義書
```

---
_パターンを記載、ファイルツリーの網羅ではない。パターンに従う新規ファイルは更新不要_
