# ヒビオル (hibioru)

**「日々を織る」** - ADHD当事者のための瞬間記録アプリ

継続することが最大の目的。立派な日記を書くことではない。

## 特徴

- **ストリーク** - Duolingo式の継続モチベーション設計
- **ほつれ** - 継続を守るためのスキップ機能（週2回付与）
- **最小単位入力** - 絵文字1つ・2タップで記録完了
- **プッシュ通知** - 定時リマインド + 追いリマインド
- **PWA対応** - スマホ・PCどこからでもアクセス可能

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router, Turbopack, React Compiler) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| アニメーション | framer-motion |
| 状態管理 | Zustand |
| データフェッチ | TanStack Query |
| バックエンド | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| 認証 | Google OAuth |
| ホスティング | Vercel |
| PWA | Web Push API, Service Worker |

## 開発環境のセットアップ

### 前提条件

- Node.js 20+
- pnpm
- Docker Desktop

### 環境変数の設定

`.env.local` を作成:

```bash
cp .env.example .env.local
```

### インストールと起動

```bash
# 依存関係のインストール
pnpm install

# ローカルSupabaseの起動（Docker Desktop起動後）
pnpm db:start

# 開発サーバーの起動
pnpm dev
```

### ローカル開発URL

| サービス | URL |
|---------|-----|
| Next.js | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |

## 開発コマンド

```bash
# 開発
pnpm dev                     # 開発サーバー起動

# ビルド・リント
pnpm build                   # プロダクションビルド
pnpm lint                    # ESLintの実行

# テスト
pnpm test                    # 全ユニットテスト実行
pnpm test:watch              # ウォッチモード
pnpm test:coverage           # カバレッジ付き
pnpm exec playwright test    # E2Eテスト実行

# Supabase
pnpm db:start                # 起動
pnpm db:stop                 # 停止
pnpm db:reset                # DBリセット（マイグレーション再適用）
pnpm db:types                # 型定義生成
pnpm db:migration:new <name> # 新規マイグレーション作成
pnpm db:push                 # リモートDBへプッシュ
pnpm db:pull                 # リモートDBからプル

# その他
pnpm vapid:generate          # VAPID鍵生成（プッシュ通知用）
```

## プロジェクト構造

```
src/
├── app/                     # Next.js App Router
├── features/                # 機能単位モジュール
│   ├── auth/                # 認証
│   ├── entry/               # 投稿
│   ├── hotsure/             # ほつれ機能
│   ├── mypage/              # マイページ
│   ├── notification/        # 通知
│   ├── streak/              # ストリーク
│   └── timeline/            # タイムライン
├── components/              # 共有UIコンポーネント
│   ├── layouts/             # レイアウト系
│   ├── providers/           # コンテキストプロバイダー
│   ├── pwa/                 # PWA関連
│   └── ui/                  # 汎用UIプリミティブ（shadcn/ui）
└── lib/                     # 共通ライブラリ
    ├── constants/           # 定数
    ├── supabase/            # Supabaseクライアント
    └── types/               # 型定義
```

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | アーキテクチャガイド |
| [docs/DESIGN.md](docs/DESIGN.md) | UI/UXデザインガイドライン |
| [docs/PROJECT.md](docs/PROJECT.md) | プロジェクト背景・意思決定 |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 要件定義書 |
| [CLAUDE.md](CLAUDE.md) | AI開発ガイド |

## 用語

| 用語 | 意味 |
|------|------|
| **ヒビオル** | サービス名（日々 + 織る） |
| **ほつれ** | 継続を守るためのスキップ機能 |
| **ほつれ直し** | ほつれを使って途切れを防ぐこと |

## ライセンス

Private
