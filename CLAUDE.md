# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**ヒビオル** (hibioru) - ADHD当事者のための瞬間記録アプリ

| 用語 | 意味 |
|------|------|
| ヒビオル | サービス名（日々 + 織る） |
| ほつれ | 継続を守るためのスキップ機能（週2回付与、自動消費） |
| ストリーク | Duolingo式の継続モチベーション設計（毎日0:00リセット） |

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

## ドキュメント構造

| カテゴリ | 場所 | 用途 |
|---------|------|------|
| **rules** | `.claude/rules/` | AI向け実装規約（パス別自動適用） |
| **steering** | `.kiro/steering/` | AI向けプロダクト方針 |
| **specs** | `.kiro/specs/` | 機能別の要件・設計・タスク |
| **docs** | `docs/` | 人間向け背景・意思決定記録 |

### 主要なrulesファイル

| ファイル | 用途 | 自動適用 |
|---------|------|---------|
| `react-patterns.md` | Server/Client Components、useEffect非同期 | `src/**/*.tsx` |
| `coding-standards.md` | TypeScript規約、命名規則 | `src/**/*.{ts,tsx}` |
| `data-fetching.md` | TanStack Query、Supabaseクエリ | `src/**/api/**` |
| `security.md` | 認証、エラー処理、ログ出力 | `src/**/*.{ts,tsx}` |
| `supabase.md` | Supabase操作、マイグレーション | `supabase/**/*` |
| `testing.md` | Jest・Playwright テスト | `**/*.test.ts`, `e2e/**` |
| `e2e-strategy.md` | E2Eテスト戦略・フロー | `e2e/**/*.ts` |
| `achievements.md` | アチーブメント閾値・バックフィル | `src/features/social/constants.ts` |
| `ui-components.md` | 共通UIコンポーネント規約 | `src/components/ui/**` |
| `performance.md` | パフォーマンス目標・Core Web Vitals | `src/app/**/page.tsx` |
| `accessibility.md` | WCAGチェックリスト | `src/components/**/*.tsx` |
| `deployment.md` | デプロイチェックリスト | （ガイド） |
| `refactoring.md` | 責務分離、共通化基準 | （ガイド） |
| `architecture.md` | Featuresベースアーキテクチャ | （ガイド） |
| `git-workflow.md` | Gitブランチ戦略 | （ガイド） |
| `skills-guide.md` | Skills活用ガイド | （ガイド） |
| `mcp-guide.md` | MCP活用ガイド | （ガイド） |

## 開発コマンド

```bash
# 開発サーバー起動
pnpm db:start && pnpm dev

# ビルド・テスト
pnpm build && pnpm lint
pnpm test                    # Jest
pnpm exec playwright test    # E2E

# Supabase
pnpm db:types               # 型定義生成
pnpm db:migration:new <name> # マイグレーション作成
pnpm db:push                # リモートDB適用
pnpm db:reset               # ローカルDBリセット
```

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |

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

## コードパターン

```typescript
// Supabaseクライアント
import { createClient } from '@/lib/supabase/server'  // Server用
import { createClient } from '@/lib/supabase/client'  // Client用

// TanStack Query
import { queryKeys } from '@/lib/constants/query-keys'
queryKeys.entries.timeline(userId)

// Result型（Railway Oriented Programming）
import { ok, err, isOk } from '@/lib/types/result'
export async function myAction(): Promise<Result<Data, AppError>> {
  if (!valid) return err({ code: 'INVALID_INPUT', message: '...' })
  return ok(data)
}

// エラー・ロギング（本番でconsole.error禁止）
import { createSafeError } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// JST日付（ストリーク・タイムライン判定に必須）
import { getJSTDateString, getJSTDayBounds, getJSTToday } from '@/lib/date-utils'
```

### 重要な設計原則

| 原則 | 説明 |
|------|------|
| バレルファイル禁止 | `index.ts` 不使用、直接インポート |
| Server Components優先 | `'use client'` はインタラクティブ部分のみ |
| dynamic export禁止 | `export const dynamic = 'force-dynamic'` 不使用 |
| 責務分離 | 300行超で見直し、500行超は必ず分離 |

## Git ブランチ戦略

```
main ← develop ← feature/*, fix/*, refactor/*
```

- `main` への直接コミット禁止
- 作業ブランチは `develop` からチェックアウト

## Skills & MCP

スキルは `/skill-name` 形式で呼び出す（小文字・ハイフン区切り）。

| 用途 | スキル名 |
|------|----------|
| 新機能開発 | `/spec-full` |
| コード実装 | `/typescript-write` |
| コードレビュー | `/typescript-review` |
| UI生成 | `/frontend-design` |
| E2Eテスト | `/e2e:generate`, `/e2e:verify`, `/e2e:fix` |
| コード理解 | `/serena`（LSPベース） |

| MCP | 用途 |
|-----|------|
| supabase | DB操作・スキーマ確認 |
| playwright-test | E2Eテスト実行 |
| context7 | ライブラリドキュメント検索 |
| serena | LSPベースシンボル検索 |
| shadcn | UIコンポーネント追加 |

詳細: `.claude/rules/skills-guide.md`, `.claude/rules/mcp-guide.md`
