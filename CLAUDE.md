# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**ヒビオル** (hibioru) - ADHD当事者のための瞬間記録アプリ

| 用語 | 意味 |
|------|------|
| ヒビオル | サービス名（日々 + 織る） |
| ほつれ | 継続を守るためのスキップ機能（週2回付与、自動消費） |
| ストリーク | Duolingo式の継続モチベーション設計（毎日0:00リセット） |

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16.1.1 (App Router, Turbopack, React Compiler) |
| 言語 | TypeScript（strictモード、any禁止） |
| スタイリング | Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| 状態管理 | Zustand（フィーチャー内 stores/） |
| データフェッチ | TanStack Query |
| バックエンド | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| 決済 | Stripe |
| ホスティング | Vercel |

---

## ドキュメント構造

| カテゴリ | 場所 | 用途 |
|---------|------|------|
| **rules** | `.claude/rules/` | AI向け実装規約（パス別自動適用） |
| **steering** | `.kiro/steering/` | AI向けプロダクト方針 |
| **specs** | `.kiro/specs/` | 機能別の要件・設計・タスク |
| **docs** | `docs/` | 人間向け背景・意思決定記録 |

### 主要なrulesファイル

- `react-patterns.md` - Server/Client Components、Next.js最適化
- `architecture.md` - Featuresベースアーキテクチャ
- `data-fetching.md` - TanStack Query、Supabaseクエリ
- `security.md` - セキュリティ規約（認証、エラー処理）
- `supabase.md` - Supabase操作、マイグレーション規約
- `testing.md` - Jest・Playwright テスト規約
- `skills-guide.md` - Skills活用ガイド
- `mcp-guide.md` - MCP活用ガイド

---

## 開発コマンド

```bash
# 開発サーバー起動（Supabase + Next.js）
pnpm db:start && pnpm dev

# ビルド・リント
pnpm build && pnpm lint

# テスト
pnpm test                           # ユニットテスト（Jest）
pnpm test:watch                     # ウォッチモード
pnpm test:coverage                  # カバレッジ付き
pnpm test -- path/to/file           # 単一ファイル実行
pnpm test -- --testPathPattern=name # パターンマッチ実行
pnpm exec playwright test           # E2Eテスト
pnpm exec playwright test --ui      # E2E UIモード（デバッグ用）

# Supabase
pnpm db:types                       # 型定義生成
pnpm db:migration:new <name>        # 新規マイグレーション
pnpm db:push                        # リモートDBにマイグレーション適用
pnpm db:pull                        # リモートDBからスキーマ取得
pnpm db:diff                        # スキーマ差分確認
pnpm db:reset                       # ローカルDBリセット
pnpm db:backup                      # リモートDBバックアップ
```

### ローカル環境

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |

---

## アーキテクチャ

**Featuresベースアーキテクチャ**（[bulletproof-react](https://github.com/alan2207/bulletproof-react)）

```
src/
├── app/          # Next.js App Router（ルーティング専用）
├── features/     # 機能単位モジュール（クロスインポート禁止）
├── components/   # 共有UIコンポーネント
└── lib/          # 共通ライブラリ
```

**機能一覧**: auth, billing, entry, hotsure, notification, social, streak, timeline

→ 詳細: `.claude/rules/architecture.md`

---

## コードパターン

```typescript
// Supabaseクライアント
import { createClient } from '@/lib/supabase/server'  // Server用
import { createClient } from '@/lib/supabase/client'  // Client用

// TanStack Query: queryKeyファクトリー
import { queryKeys } from '@/lib/constants/query-keys'
queryKeys.entries.timeline(userId)

// Result型（Railway Oriented Programming）
import type { Result } from '@/lib/types/result'
import { ok, err, isOk } from '@/lib/types/result'

// エラーハンドリング（内部情報を隠蔽）
import { createSafeError } from '@/lib/error-handler'
return { ok: false, error: createSafeError('DB_ERROR', error) }

// ロギング（本番でconsole.error禁止）
import { logger } from '@/lib/logger'
logger.error('処理失敗', error)
```

### 重要な設計原則

- **バレルファイル禁止**: `index.ts` は使用せず直接インポート
- **Server Components優先**: `'use client'` はインタラクティブな部分のみ
- **dynamic export禁止**: `export const dynamic = 'force-dynamic'` は使用しない

→ 詳細: `.claude/rules/react-patterns.md`

---

## Git ブランチ戦略

```
main ← develop ← feature/*, fix/*, refactor/*
```

- `main` への直接コミット禁止
- 作業ブランチは `develop` からチェックアウト
- mainマージ時、migrations変更があれば自動バックアップ

→ 詳細: `.claude/rules/git-workflow.md`

---

## AI-DLC（仕様駆動開発）

```bash
# 新機能開発
/spec-full "機能名"

# 仕様確認
/kiro:spec-status {feature}

# E2Eテスト
/e2e:generate {feature}
/e2e:verify {feature}
```

---

## Skills & MCP

スキルは `/skill-name` 形式で呼び出す。スキル名は **小文字・ハイフン区切り** で指定。

### プロジェクトスキル一覧

| カテゴリ | スキル名 | 用途 |
|---------|----------|------|
| **開発** | `/spec-full` | 新機能を仕様→実装→テストまで一括実行 |
| | `/typescript-write` | TypeScript/JSコード実装 |
| | `/typescript-review` | コードレビュー（読み取り専用） |
| | `/frontend-design` | 高品質UIコンポーネント生成 |
| **フレームワーク** | `/nextjs-app-router-patterns` | Next.js App Router パターン |
| | `/react-state-management` | React状態管理（Zustand等） |
| | `/tailwind-design-system` | Tailwindデザインシステム |
| **テスト** | `/javascript-testing-patterns` | Jest/Vitest ユニットテスト |
| | `/e2e-testing-patterns` | Playwright E2Eテスト |
| | `/webapp-testing` | ブラウザ操作テスト |
| **E2Eコマンド** | `/e2e:generate` | E2Eテスト生成 |
| | `/e2e:verify` | 機能検証 |
| | `/e2e:fix` | テスト失敗時の修正 |
| **その他** | `/serena` | LSPベースコード理解 |
| | `/accessibility-auditor` | WCAGアクセシビリティ監査 |
| | `/seo-review` | SEO監査 |
| | `/skill-writer` | 新規スキル作成ガイド |
| | `/context-compression` | コンテキスト圧縮 |

### MCP

| ツール | 用途 |
|--------|------|
| **supabase** | DB操作・スキーマ確認 |
| **playwright-test** | E2Eテスト実行・デバッグ |
| **context7** | ライブラリ最新ドキュメント検索 |

### context7 使用例

```bash
# 1. ライブラリIDを解決
mcp__context7__resolve-library-id --libraryName "next.js" --query "Server Components"

# 2. ドキュメント検索
mcp__context7__query-docs --libraryId "/vercel/next.js" --query "How to use Server Components"
```

**主なライブラリID**:
- `/vercel/next.js` - Next.js
- `/supabase/supabase` - Supabase
- `/tanstack/query` - TanStack Query
- `/tailwindlabs/tailwindcss` - Tailwind CSS

### よくある間違い

| ❌ 間違い | ✅ 正しい |
|-----------|-----------|
| `/Writing` | `/typescript-write` |
| `/review` | `/typescript-review` |
| `/design` | `/frontend-design` |
| `/test` | `/javascript-testing-patterns` または `/e2e:generate` |

→ 詳細: `.claude/rules/skills-guide.md`, `.claude/rules/mcp-guide.md`
