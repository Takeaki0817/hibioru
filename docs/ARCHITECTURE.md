# アーキテクチャガイド

このドキュメントでは、hibioruプロジェクトのディレクトリ構造と設計思想について説明します。

## 設計思想

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を参考にした **Featuresベースアーキテクチャ** を採用しています。

### 核となる原則

#### 1. Featuresベースアーキテクチャ

機能ごとに独立したモジュール（api, components, hooks, types）を持ちます。これにより：

- スケーラビリティと保守性の向上
- 機能ごとの責務が明確
- チーム間での協力が容易

#### 2. 一方向の依存関係

```
共有パーツ ← フィーチャー ← アプリケーション層
```

- **共有パーツ** (`components/`, `lib/`, `hooks/`, `utils/`, `types/`): 全体で使用可能
- **フィーチャー** (`features/`): 共有パーツのみから依存
- **アプリケーション層** (`app/`): フィーチャーと共有パーツの両方を使用

**クロスフィーチャーインポートは禁止**です。機能間の依存が必要な場合は、アプリケーション層で統合します。

#### 3. コロケーション（関連コードの近接配置）

機能に関連するコード（API、コンポーネント、フック、型定義）は同じディレクトリに配置します。

#### 4. バレルファイル（index.ts）の廃止

Viteのツリーシェーキングを妨げるため、バレルファイル（`index.ts`）は使用しません。直接インポートを推奨します。

```typescript
// 良い例
import { createEntry } from '@/features/entry/api/service'

// 避ける例
import { createEntry } from '@/features/entry' // index.ts経由
```

---

## ディレクトリ構造

bulletproof-reactと同様に、ソースコードは`src/`ディレクトリ配下に配置しています。

```
/
├── src/                          # ソースコード（@/エイリアスのルート）
│   ├── app/                      # Next.js App Router（ルーティング専用）
│   │   ├── api/                  # API Routes
│   │   ├── auth/                 # 認証ルート
│   │   ├── login/
│   │   ├── new/
│   │   ├── edit/[id]/
│   │   ├── timeline/
│   │   ├── mypage/
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── features/                 # 機能単位モジュール
│   │   ├── entry/                # エントリ入力・編集機能
│   │   │   ├── api/              # Server Actions, APIサービス
│   │   │   │   ├── service.ts
│   │   │   │   ├── image-service.ts
│   │   │   │   ├── draft-storage.ts
│   │   │   │   └── daily-limits.ts
│   │   │   ├── components/       # 機能固有のコンポーネント
│   │   │   │   ├── entry-form.tsx
│   │   │   │   └── image-attachment.tsx
│   │   │   ├── __tests__/        # テストファイル
│   │   │   ├── types.ts          # 型定義
│   │   │   └── utils.ts
│   │   │
│   │   ├── timeline/             # タイムライン表示機能
│   │   │   ├── api/
│   │   │   │   └── queries.ts
│   │   │   ├── components/
│   │   │   │   ├── timeline-list.tsx
│   │   │   │   ├── entry-card.tsx
│   │   │   │   ├── date-header.tsx
│   │   │   │   ├── month-calendar.tsx
│   │   │   │   └── context-menu.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-timeline.ts
│   │   │   │   ├── use-calendar-data.ts
│   │   │   │   ├── use-scroll-sync.ts
│   │   │   │   └── use-swipe-navigation.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── streak/               # ストリーク（継続記録）機能
│   │   │   ├── api/
│   │   │   │   └── service.ts
│   │   │   ├── components/
│   │   │   │   └── streak-display.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── hotsure/              # ほつれ（スキップ）機能
│   │   │   ├── api/
│   │   │   │   └── service.ts
│   │   │   ├── components/
│   │   │   │   └── hotsure-display.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── notification/         # プッシュ通知機能
│   │   │   ├── api/
│   │   │   │   ├── service.ts
│   │   │   │   ├── sender.ts
│   │   │   │   ├── followup.ts
│   │   │   │   ├── subscription.ts
│   │   │   │   ├── log.ts
│   │   │   │   ├── entry-integration.ts
│   │   │   │   └── validation.ts
│   │   │   ├── components/
│   │   │   │   └── notification-settings.tsx
│   │   │   ├── config.ts
│   │   │   ├── messages.ts
│   │   │   ├── sw-handlers.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── auth/                 # 認証機能
│   │   │   ├── api/
│   │   │   │   └── actions.ts
│   │   │   └── errors.ts
│   │   │
│   │   └── mypage/               # マイページ機能
│   │       └── components/
│   │           ├── profile-section.tsx
│   │           ├── export-section.tsx
│   │           └── logout-button.tsx
│   │
│   ├── components/               # 共有UIコンポーネント
│   │   ├── layouts/              # レイアウト系
│   │   │   └── footer-nav.tsx
│   │   ├── providers/            # コンテキストプロバイダー
│   │   │   ├── AuthProvider.tsx
│   │   │   └── QueryProvider.tsx
│   │   └── ui/                   # 汎用UIプリミティブ（将来用）
│   │
│   ├── lib/                      # 共通ライブラリ
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── types/
│   │       ├── database.ts       # Supabase自動生成
│   │       └── auth.ts
│   │
│   ├── hooks/                    # 共有カスタムフック（現在は空）
│   │
│   ├── utils/                    # ユーティリティ関数
│   │
│   ├── types/                    # グローバル型定義
│   │
│   └── config/                   # 設定
│
├── __tests__/                    # ユニットテスト
│
├── e2e/                          # E2Eテスト（Playwright）
│
├── supabase/                     # DBマイグレーション・Edge Functions
│   ├── migrations/
│   └── functions/
│
└── docs/                         # ドキュメント
```

---

## ファイル命名規則

| 対象 | 命名規則 | 例 |
|------|---------|------|
| コンポーネント | kebab-case | `entry-card.tsx`, `footer-nav.tsx` |
| ビジネスロジック | kebab-case | `service.ts`, `draft-storage.ts` |
| フック | kebab-case, `use-`プレフィックス | `use-timeline.ts` |
| 型定義 | kebab-case | `types.ts`, `database.ts` |
| ディレクトリ | kebab-case | `entry-input/`, `notification/` |

---

## 新機能追加の手順

### 1. フィーチャーディレクトリの作成

```bash
mkdir -p src/features/new-feature/{api,components,hooks,__tests__}
```

### 2. 基本ファイルの作成

```
src/features/new-feature/
├── api/
│   └── service.ts        # メインのビジネスロジック
├── components/
│   └── main-component.tsx
├── hooks/
│   └── use-new-feature.ts
├── __tests__/
│   └── service.test.ts
└── types.ts              # 型定義
```

### 3. インポートパスの規則

```typescript
// 機能内の相対インポート
import { SomeType } from '../types'
import { useHook } from '../hooks/use-hook'

// 他の機能・共有パーツからのインポート
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
```

---

## テストファイルの配置

- 各フィーチャー内の `__tests__/` ディレクトリに配置
- ファイル名: `*.test.ts` または `*.test.tsx`

```
src/features/entry/
├── api/
│   └── service.ts
├── __tests__/
│   └── service.test.ts   # service.tsのテスト
└── types.ts
```

---

## 注意事項

### クロスフィーチャーインポートの禁止

機能間で直接インポートしないでください。

```typescript
// 禁止: feature → feature
import { useStreak } from '@/features/streak/hooks/use-streak'

// 許可: feature → lib/components（共有パーツ）
import { createClient } from '@/lib/supabase/server'
```

### Server/Client Components

- デフォルトはServer Component
- インタラクティブな部分のみ `'use client'` を使用
- Server Actions には `'use server'` を使用

---

## 参考資料

- [bulletproof-react](https://github.com/alan2207/bulletproof-react)
- [Next.js App Router ドキュメント](https://nextjs.org/docs/app)
