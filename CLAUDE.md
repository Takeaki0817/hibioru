# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**ヒビオル** (hibioru) - ADHD当事者のための瞬間記録アプリ
- コンセプト: 「日々を織る」
- 目的: 継続することが最大の目的。立派な日記を書くことではない

### コア機能
- **ストリーク**: Duolingo式の継続モチベーション設計（毎日0:00リセット）
- **ほつれ**: 継続を守るスキップ機能（週2回付与、自動消費）
- **最小単位入力**: 絵文字1つ・2タップで記録完了
- **プッシュ通知**: 定時リマインド + 追いリマインド

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, Turbopack, React Compiler)
- **言語**: TypeScript（strictモード、any禁止）
- **スタイリング**: Tailwind CSS v4
- **UIコンポーネント**: shadcn/ui, Radix UI, Lucide Icons
- **アニメーション**: framer-motion
- **状態管理**: Zustand（フィーチャー内の stores/ ディレクトリ）
- **データフェッチ**: TanStack Query (React Query)
- **日付処理**: date-fns（ストリーク計算等で使用）
- **バックエンド/DB**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **認証**: Google OAuth (Supabase Auth)
- **ホスティング**: Vercel
- **PWA**: Web Push API、Service Worker

### 重要な設計原則

- **バレルファイル（index.ts）禁止**: ツリーシェーキングを妨げるため直接インポートを使用
- **interface優先**: 型定義には`type`より`interface`を優先
- **Server Components優先**: `'use client'`はインタラクティブな部分のみに使用
- **dynamic export禁止**: `export const dynamic = 'force-dynamic'` は使用しない（Cache Components競合の原因）

### Supabaseクライアントの使い分け

```typescript
// Server Components, Route Handlers, Server Actions
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client Components（'use client'）
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### データフェッチ規約

```typescript
// select最適化: 必要カラムのみ取得
.select('id, user_id, content, created_at')  // ✅
.select('*')                                  // ❌

// TanStack Query: queryKeyファクトリーを使用
import { queryKeys } from '@/lib/constants/query-keys'
queryKeys.entries.timeline(userId)            // ✅
['timeline', userId]                          // ❌
```

### 共有ユーティリティ

```typescript
// Result型（Railway Oriented Programming）
import type { Result } from '@/lib/types/result'
import { ok, err, isOk } from '@/lib/types/result'

// JST日付処理（ストリーク計算、日次制限チェック等）
import { getJSTToday, getJSTDayBounds } from '@/lib/date-utils'
```

### 認証フロー

`middleware.ts` でセッション管理と自動リダイレクトを実行:
- **公開パス**: `/`, `/login`, `/offline`, `/lp`, `/auth/callback`
- **保護されたパス**: 上記以外（未認証→`/login`にリダイレクト）
- **認証済み**: `/` or `/login` → `/timeline` にリダイレクト

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド・リント
pnpm build
pnpm lint

# ユニットテスト（Jest）
pnpm test                    # 全テスト実行
pnpm test:watch              # ウォッチモード
pnpm test:coverage           # カバレッジ付き
pnpm test -- path/to/test    # 単一テスト実行

# E2Eテスト（Playwright）
pnpm exec playwright test           # 全E2Eテスト実行
pnpm exec playwright test --ui      # UIモードで実行
pnpm exec playwright test auth      # 特定ファイルのみ実行

# Supabase（Docker）
pnpm db:start                # 起動
pnpm db:stop                 # 停止
pnpm db:reset                # DBリセット（マイグレーション再適用）
pnpm db:types                # 型定義生成 → src/lib/types/database.generated.ts
pnpm db:migration:new <name> # 新規マイグレーション
pnpm db:push                 # リモートDBへプッシュ
pnpm db:pull                 # リモートDBからプル

# プッシュ通知
pnpm vapid:generate          # VAPID鍵生成
```

## ローカル開発環境

**前提条件**: Node.js 20+、pnpm、Docker Desktop

**開発時は必ずローカルのSupabase（Docker）を使用すること。**

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |

```bash
# 開発開始手順
pnpm db:start  # Docker Desktop起動後
pnpm dev
```

## デプロイ・インフラ操作

### 操作方針
- **Supabase/Vercelのデプロイ設定依頼時**: CLIを使用して操作を試みる
- **ローカル開発時**: Docker上のSupabaseを操作する（本番環境には触れない）

### Supabase CLI
```bash
supabase login                    # 認証
supabase link --project-ref <ref> # プロジェクトリンク
supabase db push                  # マイグレーション適用
supabase functions deploy <name>  # Edge Functions デプロイ
supabase secrets set <KEY>=<val>  # シークレット設定
```

### Vercel CLI
```bash
vercel login                      # 認証
vercel link                       # プロジェクトリンク
vercel env pull                   # 環境変数取得
vercel --prod                     # 本番デプロイ
```

## アーキテクチャ

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用した**Featuresベースアーキテクチャ**。

### 依存関係の方向

```
共有パーツ ← フィーチャー ← アプリケーション層
```

**クロスフィーチャーインポートは禁止**。機能間の依存が必要な場合はアプリケーション層で統合。

```typescript
// ❌ 禁止: feature → feature
import { useStreak } from '@/features/streak/hooks/use-streak'

// ✅ 許可: feature → 共有パーツ
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
```

### ディレクトリ構造

```
src/                          # @/エイリアスのルート
├── app/                      # Next.js App Router（ルーティング専用）
├── features/                 # 機能単位モジュール（下記参照）
├── components/              # 共有UIコンポーネント
│   ├── layouts/             # レイアウト系
│   ├── providers/           # コンテキストプロバイダー
│   ├── pwa/                 # PWA関連（通知許可等）
│   └── ui/                  # 汎用UIプリミティブ（shadcn/ui）
└── lib/                     # 共通ライブラリ
    ├── constants/           # アプリ設定、queryKeyファクトリー
    ├── supabase/            # Supabaseクライアント
    ├── types/               # 型定義（database.generated.ts, result.ts等）
    └── date-utils.ts        # JST日付処理ユーティリティ
```

### フィーチャー構造テンプレート

```
src/features/{feature}/
├── api/                     # ビジネスロジック、Server Actions
├── components/              # 機能固有コンポーネント
├── hooks/                   # 機能固有フック（オプション）
├── stores/                  # Zustand ストア（オプション）
├── __tests__/               # テストファイル
├── constants.ts             # 機能固有の定数（オプション）
└── types.ts                 # 型定義
```

**機能一覧**: entry, timeline, streak, hotsure, notification, auth, mypage

### PWA/Service Worker

`src/lib/constants/app-config.ts` と `public/sw.js` は手動で同期が必要:
- アプリ名、通知設定、キャッシュバージョン等の変更時
- sw.jsは静的ファイルのためビルド時に自動反映されない

## 用語定義

| 用語 | 意味 |
|------|------|
| ヒビオル | サービス名（日々 + 織る） |
| ほつれ | 継続を守るためのスキップ機能 |
| ほつれ直し | ほつれを使って途切れを防ぐこと |

## 主要ドキュメント

- `docs/ARCHITECTURE.md` - 詳細なアーキテクチャガイド
- `docs/DESIGN.md` - UI/UXデザインガイドライン
- `docs/PROJECT.md` - プロジェクト背景、意思決定
- `docs/REQUIREMENTS.md` - 要件定義書
- `.kiro/steering/` - AI向けプロダクト・ビジネスコンテキスト
- `.claude/rules/` - コーディング規約（パス単位で自動適用）

---

## AI-DLC（仕様駆動開発）

Kiro-style Spec Driven Development を採用。

### パス
- **Steering**: `.kiro/steering/` - プロジェクト全体のルール・コンテキスト
- **Specs**: `.kiro/specs/` - 機能別の仕様・設計・タスク

### アクティブな仕様

| 機能 | 説明 |
|------|------|
| auth | 認証機能 |
| timeline | タイムライン/カレンダー |
| entry-input | 入力/編集機能 |
| streak | ストリーク（継続記録） |
| mypage | マイページ |
| notification | プッシュ通知 |

進捗確認: `/kiro:spec-status [feature-name]`

### ワークフロー

```
Phase 0（任意）: /kiro:steering, /kiro:steering-custom

Phase 1（仕様策定）:
  /kiro:spec-init "description"
  /kiro:spec-requirements {feature}
  /kiro:spec-design {feature} [-y]
  /kiro:spec-tasks {feature} [-y]

Phase 2（実装）:
  /kiro:spec-impl {feature} [tasks]
```

### ルール
- **3フェーズ承認**: Requirements → Design → Tasks → Implementation
- **レビュー必須**: 各フェーズで人間のレビューが必要（`-y`で省略可能）
- **日本語出力**: プロジェクトファイルのMarkdownは日本語で記述
