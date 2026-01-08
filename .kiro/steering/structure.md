# プロジェクト構造

詳細なアーキテクチャガイドは `.claude/rules/architecture.md` を参照。

## 組織方針

**Featuresベースアーキテクチャ + App Router標準構成**

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用。
機能ごとに独立したモジュール（api, components, hooks, stores, types）を持つ。

---

## ディレクトリ構造

```
src/
├── app/                      # Next.js App Router（ルーティング専用）
├── features/                 # 機能単位モジュール
│   ├── auth/                # 認証
│   ├── entry/               # エントリ入力・編集
│   ├── timeline/            # タイムライン表示
│   ├── streak/              # ストリーク
│   ├── hotsure/             # ほつれ
│   ├── notification/        # プッシュ通知
│   └── social/              # ソーシャル（プロフィール、フォロー、通知）
├── components/              # 共有UIコンポーネント
│   ├── layouts/
│   ├── providers/
│   └── ui/
└── lib/                     # 共通ライブラリ
    ├── supabase/
    ├── constants/
    └── types/
```

---

## 依存関係ルール

```
共有パーツ ← フィーチャー ← アプリケーション層
```

- **共有パーツ** (`components/`, `lib/`): 全体で使用可能
- **フィーチャー** (`features/`): 共有パーツのみから依存
- **アプリケーション層** (`app/`): フィーチャーと共有パーツの両方を使用

**クロスフィーチャーインポート禁止**: 機能間の依存が必要な場合は、アプリケーション層で統合。

---

## フィーチャー構造テンプレート

```
src/features/{feature}/
├── api/                     # ビジネスロジック、Server Actions
├── components/              # 機能固有コンポーネント
├── hooks/                   # 機能固有フック
├── stores/                  # Zustand ストア
│   ├── {feature}-store.ts
│   └── __tests__/           # ストアのテスト
├── __tests__/               # テストファイル
├── constants.ts             # 機能固有の定数
└── types.ts                 # 型定義
```

---

## 命名規則

| 種類 | パターン | 例 |
|------|----------|-----|
| コンポーネント | kebab-case | `entry-card.tsx` |
| ビジネスロジック | kebab-case | `service.ts`, `draft-storage.ts` |
| フック | kebab-case, `use-`プレフィックス | `use-timeline.ts` |
| 型定義 | kebab-case | `types.ts` |
| ディレクトリ | kebab-case | `entry-input/` |
| 定数 | SCREAMING_SNAKE_CASE | `STREAK_RESET_HOUR` |

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
// components/entry/entry-form.tsx
'use client';
export function EntryForm() { ... }
```

### バレルファイル（index.ts）の廃止

ツリーシェーキングを妨げるため、バレルファイルは使用しない。直接インポートを推奨。

```typescript
// 良い例
import { createEntry } from '@/features/entry/api/service'

// 避ける例
import { createEntry } from '@/features/entry' // index.ts経由
```

---

_パターンを記載、ファイルツリーの網羅ではない。パターンに従う新規ファイルは更新不要_
