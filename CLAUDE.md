# CLAUDE.md

このファイルは、Claude Code がこのリポジトリのコードを扱う際のガイダンスを提供します。

## プロジェクト概要

**ヒビオル** (hibioru) - ADHD当事者のための瞬間記録アプリ
- コンセプト: 「日々を織る」
- 目的: 継続することが最大の目的。立派な日記を書くことではない

### コア機能
- **ストリーク**: Duolingo式の継続モチベーション設計（毎日0:00リセット）
- **ほつれ**: 継続を守るスキップ機能（週2回付与、自動消費）
- **最小単位入力**: 絵文字1つ・2タップで記録完了
- **プッシュ通知**: 定時リマインド + 追いリマインド

### 用語定義

| 用語 | 意味 |
|------|------|
| ヒビオル | サービス名（日々 + 織る） |
| ほつれ | 継続を守るためのスキップ機能 |
| ほつれ直し | ほつれを使って途切れを防ぐこと |

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router, Turbopack, React Compiler) |
| 言語 | TypeScript（strictモード、any禁止） |
| スタイリング | Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| アニメーション | framer-motion |
| 状態管理 | Zustand（フィーチャー内 stores/） |
| データフェッチ | TanStack Query |
| 日付処理 | date-fns |
| バックエンド | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| 認証 | Google OAuth (Supabase Auth) |
| ホスティング | Vercel |
| PWA | Web Push API, Service Worker |

### 重要な設計原則

- **バレルファイル（index.ts）禁止**: ツリーシェーキングを妨げるため直接インポートを使用
- **interface優先**: 型定義には`type`より`interface`を優先
- **Server Components優先**: `'use client'`はインタラクティブな部分のみに使用
- **dynamic export禁止**: `export const dynamic = 'force-dynamic'` は使用しない

### コードパターン（クイックリファレンス）

```typescript
// Supabaseクライアント
import { createClient } from '@/lib/supabase/server'  // Server用
import { createClient } from '@/lib/supabase/client'  // Client用

// select最適化: 必要カラムのみ取得
.select('id, user_id, content, created_at')  // OK
.select('*')                                  // NG

// TanStack Query: queryKeyファクトリーを使用
import { queryKeys } from '@/lib/constants/query-keys'
queryKeys.entries.timeline(userId)

// Result型（Railway Oriented Programming）
import type { Result } from '@/lib/types/result'
import { ok, err, isOk } from '@/lib/types/result'

// JST日付処理
import { getJSTToday, getJSTDayBounds } from '@/lib/date-utils'
```

---

## ドキュメント構造

```
CLAUDE.md（このファイル）= エントリーポイント、全体概要
    │
    ├── .claude/rules/    = HOW（規約）：AI向け、パス別自動適用
    │   ├── architecture.md       # Featuresベースアーキテクチャ
    │   ├── nextjs.md             # Next.js 16最適化
    │   ├── react-patterns.md     # Server/Client Components
    │   ├── ui-components.md      # shadcn/ui規約
    │   ├── coding-standards.md   # TypeScript・命名規則
    │   ├── supabase.md           # Supabaseクライアント
    │   ├── data-fetching.md      # TanStack Query・クエリ最適化
    │   ├── testing.md            # Jest・Playwright
    │   ├── git-workflow.md       # Gitブランチ戦略
    │   ├── refactoring.md        # 共通化・責務分離
    │   ├── skills-guide.md       # Skills活用ガイド ★
    │   └── mcp-guide.md          # MCP活用ガイド ★
    │
    ├── .kiro/steering/   = WHAT（方針）：AI向け、プロダクトコンテキスト
    │   ├── product.md            # プロダクト概要・フェーズ計画
    │   ├── tech.md               # 技術スタック・重要決定
    │   └── structure.md          # プロジェクト構造・命名規則
    │
    ├── .kiro/specs/      = 機能仕様：機能別の要件・設計・タスク
    │
    └── docs/             = WHY（背景）：人間向け、意思決定の記録
        ├── ARCHITECTURE.md       # 詳細アーキテクチャ
        ├── DESIGN.md             # UI/UXデザインガイドライン
        ├── PROJECT.md            # プロジェクト背景・意思決定
        ├── REQUIREMENTS.md       # 要件定義書
        ├── REFACTORING-PHILOSOPHY.md  # リファクタリング思想
        └── IMPLEMENTATION_LOG.md # 実装履歴・進捗ログ
```

### 役割分担

| カテゴリ | 対象 | 自動読込 | 内容 |
|---------|------|----------|------|
| `.claude/rules/` | AI | ファイル操作時 | 実装パターン・コーディング規約 |
| `.kiro/steering/` | AI | セッション開始時 | プロダクト・技術の方針 |
| `.kiro/specs/` | AI | 参照時 | 機能別の要件・設計・タスク |
| `docs/` | 人間 | - | 背景説明・意思決定の根拠 |

---

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド・リント
pnpm build && pnpm lint

# ユニットテスト（Jest）
pnpm test                    # 全テスト
pnpm test:watch              # ウォッチモード
pnpm test -- path/to/test    # 単一テスト

# E2Eテスト（Playwright）
pnpm exec playwright test           # 全E2E
pnpm exec playwright test --ui      # UIモード
pnpm exec playwright test auth      # 特定ファイル

# Supabase（Docker）
pnpm db:start                # 起動
pnpm db:stop                 # 停止
pnpm db:reset                # DBリセット
pnpm db:types                # 型定義生成 → src/lib/types/database.generated.ts
pnpm db:migration:new <name> # 新規マイグレーション
```

## ローカル開発環境

**前提条件**: Node.js 20+、pnpm、Docker Desktop

**開発時は必ずローカルのSupabase（Docker）を使用すること。**

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |

```bash
pnpm db:start && pnpm dev
```

---

## アーキテクチャ

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用した**Featuresベースアーキテクチャ**。

```
共有パーツ ← フィーチャー ← アプリケーション層
```

**クロスフィーチャーインポートは禁止**。

```
src/
├── app/                      # Next.js App Router
├── features/                 # 機能単位モジュール
│   └── {feature}/
│       ├── api/              # ビジネスロジック
│       ├── components/       # 機能固有コンポーネント
│       ├── hooks/            # 機能固有フック
│       ├── stores/           # Zustand ストア
│       └── types.ts          # 型定義
├── components/               # 共有UIコンポーネント
└── lib/                      # 共通ライブラリ
```

**機能一覧**: auth, entry, hotsure, notification, social, streak, timeline

→ 詳細: `.claude/rules/architecture.md`

---

## AI-DLC（仕様駆動開発）

Kiro-style Spec Driven Development を採用。

### アクティブな仕様

| 機能 | 説明 |
|------|------|
| auth | 認証機能 |
| timeline | タイムライン/カレンダー |
| entry-input | 入力/編集機能 |
| streak | ストリーク（継続記録） |
| social | ソーシャル（プロフィール、フォロー） |
| notification | プッシュ通知 |

### ワークフロー

```
Phase 1（仕様策定）:
  /kiro:spec-init "description"
  /kiro:spec-requirements {feature}
  /kiro:validate-gap {feature}（任意: 既存コードベースとの整合性確認）
  /kiro:spec-design {feature} [-y]
  /kiro:validate-design {feature}（任意: 設計レビュー）
  /kiro:spec-tasks {feature} [-y]

Phase 2（実装）:
  /kiro:spec-impl {feature} [tasks]
  /kiro:validate-impl {feature}（任意: 実装後の検証）
```

進捗確認: `/kiro:spec-status [feature-name]`

---

## Git ブランチ戦略

```
main        ← 本番環境
  └── develop   ← 開発用ベース
        ├── feature/*   ← 新機能
        ├── fix/*       ← バグ修正
        └── refactor/*  ← リファクタリング
```

- `main` への直接コミット禁止
- 作業ブランチは `develop` からチェックアウト
- PR作成時は `--base develop` を指定

→ 詳細: `.claude/rules/git-workflow.md`

---

## Skills & MCP

### Skills（スキル）

プロジェクト固有のスキルが `.claude/skills/` に定義されています。

| スキル | 用途 |
|--------|------|
| **spec-full** | 新機能を仕様→実装→テストまで一括実行 |
| **serena** | LSPベースのシンボル検索・リファクタリング |
| **javascript-testing-patterns** | Jest・Vitest・Testing Library |
| **e2e-testing-patterns** | Playwright・Cypress E2E |
| **webapp-testing** | ブラウザインタラクティブテスト |
| **frontend-design** | 高品質フロントエンドUI生成 |

→ 詳細: `.claude/rules/skills-guide.md`

### MCP（Model Context Protocol）

`.mcp.json` に定義されたMCPサーバーが利用可能です。

| サーバー | 用途 |
|---------|------|
| **supabase** | DB操作・スキーマ確認 |
| **serena** | シンボル検索・参照追跡 |
| **playwright-test** | E2Eテスト実行・デバッグ |
| **playwright** | ブラウザ操作 |
| **shadcn** | UIコンポーネント追加 |
| **vercel-awesome-ai** | Vercel操作・ドキュメント検索 |
| **gcloud** | Google Cloud操作 |

→ 詳細: `.claude/rules/mcp-guide.md`

---

## クイックリファレンス

### よく使うコマンド

```bash
# 新機能開発
/spec-full "機能名"

# 仕様確認
/kiro:spec-status {feature}

# E2Eテスト
/e2e:generate {feature}
/e2e:verify {feature}

# Git操作
/git:create-branch
/git:create-commit
/git:create-pr
```

### 認証フロー

`middleware.ts` でセッション管理:
- **公開パス**: `/`, `/login`, `/offline`, `/lp`, `/auth/callback`
- **保護されたパス**: 上記以外（未認証→`/login`にリダイレクト）
- **認証済み**: `/` or `/login` → `/timeline` にリダイレクト

### PWA/Service Worker

`src/lib/constants/app-config.ts` と `public/sw.js` は手動で同期が必要。
