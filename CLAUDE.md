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

- **フレームワーク**: Next.js 16 (App Router, Turbopack)
- **言語**: TypeScript（strictモード、any禁止）
- **スタイリング**: Tailwind CSS v4
- **UIコンポーネント**: shadcn/ui, Radix UI, Lucide Icons
- **アニメーション**: framer-motion
- **状態管理**: Zustand（フィーチャー内の stores/ ディレクトリ）
- **データフェッチ**: TanStack Query (React Query)
- **バックエンド/DB**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **認証**: Google OAuth (Supabase Auth)
- **ホスティング**: Vercel
- **PWA**: Web Push API、Service Worker

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# テスト
pnpm test                    # 全テスト実行
pnpm test:watch              # ウォッチモード
pnpm test:coverage           # カバレッジ付き
pnpm test -- path/to/test    # 単一テスト実行

# Supabase（Docker）
pnpm db:start                # 起動
pnpm db:stop                 # 停止
pnpm db:reset                # DBリセット（マイグレーション再適用）
pnpm db:types                # 型定義生成
pnpm db:migration:new <name> # 新規マイグレーション
```

## ローカル開発環境

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

## アーキテクチャ

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用した**Featuresベースアーキテクチャ**。

### 依存関係の方向

```
共有パーツ ← フィーチャー ← アプリケーション層
```

**クロスフィーチャーインポートは禁止**。機能間の依存が必要な場合はアプリケーション層で統合。

### ディレクトリ構造

```
src/                          # @/エイリアスのルート
├── app/                      # Next.js App Router（ルーティング専用）
├── features/                 # 機能単位モジュール
│   ├── entry/               # エントリ入力・編集
│   ├── timeline/            # タイムライン表示
│   ├── streak/              # ストリーク（継続記録）
│   ├── hotsure/             # ほつれ（スキップ）
│   ├── notification/        # プッシュ通知
│   ├── auth/                # 認証
│   └── mypage/              # マイページ
├── components/              # 共有UIコンポーネント
│   ├── layouts/             # レイアウト系
│   ├── providers/           # コンテキストプロバイダー
│   └── ui/                  # 汎用UIプリミティブ
└── lib/                     # 共通ライブラリ
    ├── supabase/            # Supabaseクライアント
    └── types/               # 型定義（database.ts等）
```

### フィーチャーの構造

```
src/features/{feature}/
├── api/                     # ビジネスロジック、Server Actions
├── components/              # 機能固有コンポーネント
├── hooks/                   # 機能固有フック
├── stores/                  # Zustand ストア（Props Drilling解消用）
│   ├── {feature}-store.ts
│   └── __tests__/           # ストアのテスト
├── __tests__/               # テストファイル
└── types.ts                 # 型定義
```

### コーディング規約

- **ファイル命名**: kebab-case（`entry-form.tsx`, `use-timeline.ts`）
- **バレルファイル禁止**: `index.ts`は使用しない。直接インポートを推奨
- **Server/Client**: デフォルトはServer Component。インタラクティブな部分のみ`'use client'`
- **状態管理**: Props Drillingを避け、Zustandストアを使用

```typescript
// 良い例
import { createEntry } from '@/features/entry/api/service'
import { useTimelineStore } from '@/features/timeline/stores/timeline-store'

// 避ける例
import { createEntry } from '@/features/entry' // index.ts経由
```

### UIコンポーネント規約

- **shadcn/ui**: `src/components/ui/`に配置。`npx shadcn@latest add`で追加
- **カスタムコンポーネント**: `motion-button.tsx`, `motion-card.tsx`等はframer-motion統合版
- **アイコン**: Lucide Iconsを使用（`lucide-react`）

### デザイン原則（ADHD向け）

- **視覚的に軽く**: Sage Green基調、余白を十分に
- **情報を絞る**: 一画面に表示する要素を最小限に
- **フィードバックは控えめ**: 派手なアニメーションより微細な動き
- **ポジティブな表現**: 失敗を責めず、行動を促す文言

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
- `.kiro/steering/` - AI向けプロジェクトコンテキスト

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
