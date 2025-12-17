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

- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript（strictモード、any禁止）
- **スタイリング**: Tailwind CSS
- **バックエンド/DB**: Supabase (PostgreSQL, Auth, Storage)
- **認証**: Google OAuth (Supabase Auth)
- **ホスティング**: Vercel
- **PWA**: マルチデバイス対応、Web Push API

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# Supabaseローカル起動
supabase start
```

## MCP (Model Context Protocol) の活用

環境構築やトラブルシューティングを行う際は、`.mcp.json`に登録されているMCPサーバーを積極的に活用すること。

### 登録済みMCPサーバー

| MCP | 用途 |
|-----|------|
| **next-devtools** | Next.js開発ツール、ビルドエラー診断、ルート確認 |
| **serena** | コードベース探索、シンボル検索、リファクタリング支援 |
| **supabase** | DB操作、マイグレーション、Edge Functions、ドキュメント検索 |
| **vercel-awesome-ai** | デプロイ状況確認、ビルドログ、Vercelドキュメント検索 |
| **gcloud** | Google Cloud関連操作 |

### Context7によるドキュメント確認

ライブラリやフレームワークの使い方を確認する際は、Context7を使用して最新のドキュメントを取得すること。

```
# Context7の使用手順
1. resolve-library-id でライブラリIDを取得
2. get-library-docs でドキュメントを取得

# 例: Next.jsのドキュメントを確認
resolve-library-id: "next.js"
get-library-docs: "/vercel/next.js" topic="app-router"
```

### トラブルシューティング時の推奨手順

1. **Next.js関連**: `nextjs_index` → `nextjs_call` でランタイムエラー確認
2. **Supabase関連**: `mcp__supabase__get_logs` でログ確認、`mcp__supabase__search_docs` でドキュメント検索
3. **デプロイ関連**: `mcp__vercel-awesome-ai__get_deployment_build_logs` でビルドログ確認
4. **ライブラリ使用法**: Context7の `get-library-docs` で最新ドキュメント取得

## プロジェクト構造

```
/app                 # Next.js App Router ページ・レイアウト
/components          # 再利用可能なUIコンポーネント
  /ui/               # 汎用UIプリミティブ
  /timeline/         # タイムライン関連
  /calendar/         # カレンダー関連
  /entry/            # 投稿カード、入力フォーム
  /streak/           # 継続記録表示
/lib                 # ビジネスロジック、ユーティリティ
  /supabase/         # Supabaseクライアント、クエリ
  /streak/           # ストリーク計算ロジック
  /hotsure/          # ほつれ消費ロジック
  /notification/     # 通知関連
  /types/            # 共通型定義
/supabase            # マイグレーション、シード
/docs                # プロジェクトドキュメント
```

## 主要なドキュメント

- `docs/PROJECT.md` - プロジェクト背景、意思決定
- `docs/REQUIREMENTS.md` - 要件定義書（画面設計、データ設計含む）
- `.kiro/steering/` - AI向けプロジェクトコンテキスト

## コーディング規約

### ファイル命名
- コンポーネント: PascalCase (`EntryCard.tsx`)
- ロジック・ユーティリティ: camelCase (`calculateStreak.ts`)
- 定数: SCREAMING_SNAKE_CASE

### インポート順序
1. 外部ライブラリ
2. 内部モジュール（`@/`パスエイリアス）
3. 相対インポート（同一機能内のみ）

### Server/Client Components
- デフォルトはServer Component
- インタラクティブな部分のみ`'use client'`

## 用語定義

| 用語 | 意味 |
|------|------|
| ヒビオル | サービス名（日々 + 織る） |
| ほつれ | 継続を守るためのスキップ機能 |
| ほつれ直し | ほつれを使って途切れを防ぐこと |

---

## AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification
- **Steering** (`.kiro/steering/`) - AI向けプロジェクト全体のルールとコンテキスト
- **Specs** (`.kiro/specs/`) - 個別機能の開発プロセスを形式化

### Active Specifications
- `auth` - 認証機能
- `timeline` - タイムライン/カレンダー
- `entry-input` - 入力/編集機能
- `streak` - ストリーク（継続記録）
- `mypage` - マイページ
- `notification` - プッシュ通知

進捗確認: `/kiro:spec-status [feature-name]`

### Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional)

### Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Think in English, generate responses in Japanese
- All Markdown content in project files MUST be written in Japanese
