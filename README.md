# ヒビオル (hibioru)

**「日々を織る」** - ADHD当事者のための瞬間記録アプリ

> 継続することが最大の目的。立派な日記を書くことではない。

---

## なぜこのアプリを作ったのか

### ADHD当事者の「継続」という課題

既存の日記アプリやメモツール（Obsidian、Notion、Day One等）を試したが、どれも**ADHD当事者にとっての「継続」という課題に特化していなかった**。

開発者自身の経験から：

- **Duolingo 122日継続** - 継続できた理由を分析し、設計に応用
- **Obsidian 挫折**（約1ヶ月で脱落） - 失敗要因を特定し、解決策を実装

### 挫折の原因分析

| 失敗要因 | 詳細 |
|---------|------|
| 入力のハードル | 「何を書けばいいか」で手が止まる |
| スマホでの不便さ | PCでないと使いづらい |
| 新規性の報酬切れ | 1ヶ月で飽きる |
| メンタルが落ちると書けない | 調子が悪い日ほど記録が途切れる |
| ゴールの欠落 | 続ける意味が見えなくなる |

これらすべてを解決するために、**ゼロから設計し直した**のがヒビオル。

---

## 設計思想：Duolingoから学んだ4つの原則

Duolingoで122日継続できた成功パターンを、日記アプリに適用：

### 1. 損失回避

ストリーク（継続日数）を「**失いたくない資産**」として設計。人間は利益を得るより損失を避けることに強く動機づけられる。

### 2. 最小単位が極端に小さい

**絵文字1つ、2タップで記録完了**。「やらない理由」を徹底的に潰す。立派な文章を書く必要はない。

### 3. セーフティネット（ほつれ）

週2回付与される「ほつれ」で、**記録を忘れた日も継続が途切れない**。完全な失敗を防ぎ、再挑戦へのハードルを下げる。

### 4. 可視化

記録が目に見える形で残る。過去の継続が**視覚的な資産**として蓄積され、続ける意味を実感できる。

---

## 機能と役割

各機能が「継続」というコンセプトにどう貢献するか：

| 機能 | 役割 | 対処する課題 |
|------|------|-------------|
| **ストリーク** | 継続日数の可視化。Duolingo式の損失回避心理を活用 | ゴールの欠落 |
| **ほつれ** | 週2回のスキップ機能。記録がない日に自動消費 | メンタルが落ちると書けない |
| **最小単位入力** | 絵文字1つでOK。2タップで記録完了 | 入力のハードル |
| **プッシュ通知** | 定時リマインド + 追いリマインド（最大3回） | 忘れる |
| **タイムライン** | 日付別の記録表示。スクロールと日付が同期 | 記録の可視化 |
| **ソーシャル** | フォロー・達成共有。SNS化しない設計 | 外発的動機づけ |

### 「ほつれ」の設計意図

「ほつれ」は布がほつれるイメージから。**失敗を許容し、修復可能にする**という思想を込めた。

- 毎週月曜0:00に2回分リセット（繰り越しなし）
- 前日に記録がなければ自動で1つ消費
- 使用した日もストリークは維持される

手動操作不要の自動消費にしたのは、**ADHDの「操作を忘れる」「判断できない」という特性への配慮**。

### ソーシャル機能の原則

**SNS化しない**ことを厳格に守る：

- いいね数・フォロワー数は他人に非表示
- ランキング・おすすめ機能なし
- 報酬は「継続」に対してのみ

比較・競争を煽らず、**相互の応援環境**を形成する設計。

---

## アーキテクチャ

### Featuresベースアーキテクチャ

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用。

```
共有パーツ ← フィーチャー ← アプリケーション層
```

**採用理由：**

| 利点 | 説明 |
|------|------|
| **スケーラビリティ** | 新機能追加時に既存機能への影響なし |
| **テスト容易性** | 機能単位でテストが独立 |
| **責務の明確化** | 各機能が自己完結 |

**クロスフィーチャーインポートは禁止**。機能間の依存が必要な場合はアプリケーション層（`app/`）で統合。

```
src/
├── app/                      # Next.js App Router（統合層）
├── features/                 # 機能単位モジュール
│   ├── auth/                 # 認証
│   ├── entry/                # 投稿
│   ├── hotsure/              # ほつれ機能
│   ├── notification/         # 通知
│   ├── social/               # ソーシャル
│   ├── streak/               # ストリーク
│   └── timeline/             # タイムライン
├── components/               # 共有UIコンポーネント
└── lib/                      # 共通ライブラリ
```

---

## 技術的優位性

### Next.js 16 最新機能のフル活用

| 機能 | 効果 |
|------|------|
| **React Compiler** | 自動メモ化によるパフォーマンス最適化 |
| **Turbopack** | 開発時のビルド高速化 |
| **Server Components** | クライアントバンドルサイズ削減 |

`'use client'` はインタラクティブな部分のみに限定し、**Server Components優先**で設計。

### 型安全性：TypeScript strict + Result型

Railway Oriented Programming パターンを採用：

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

- 例外に頼らないエラーハンドリング
- すべてのServer Actionsで統一的に使用
- コンパイル時にエラーハンドリング漏れを検出

### 状態管理の層別設計

| レイヤー | 技術 | 用途 |
|---------|------|------|
| ローカル状態 | Zustand | フィーチャー内の状態管理 |
| サーバー状態 | TanStack Query | キャッシング・再取得 |
| リアルタイム | Supabase Realtime | ソーシャルフィード同期 |

### パフォーマンス最適化

- **カーソルベースページネーション** - オフセットより高速、無限スクロールに最適
- **Request単位キャッシュ** - React 18.4の`cache()`でリクエスト内の重複クエリ排除
- **必要カラムのみ取得** - `select('*')` 禁止、明示的なカラム指定

### JST日付管理

ユーザーの心理的な「今日」（JST基準）とシステムの「今日」を一致させる設計：

```typescript
// 例: ストリーク判定はJST 0:00でリセット
function getJSTDayBounds(referenceDate: Date) {
  // JST基準で当日の開始・終了をUTCで返す
}
```

データベースはUTC保存、表示・判定時にJST変換。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router, Turbopack, React Compiler) |
| 言語 | TypeScript（strictモード、any禁止） |
| スタイリング | Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| アニメーション | framer-motion |
| 状態管理 | Zustand, TanStack Query |
| 日付処理 | date-fns |
| バックエンド | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| 認証 | Google OAuth (Supabase Auth) |
| ホスティング | Vercel |
| PWA | Web Push API, Service Worker |

---

## 開発環境

### 前提条件

- Node.js 20+
- pnpm
- Docker Desktop

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/Takeaki0817/hibioru.git
cd hibioru

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local

# ローカルSupabaseの起動
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

---

## 開発コマンド

```bash
# 開発
pnpm dev                     # 開発サーバー起動

# ビルド・リント
pnpm build                   # プロダクションビルド
pnpm lint                    # ESLint実行

# テスト
pnpm test                    # ユニットテスト（Jest）
pnpm exec playwright test    # E2Eテスト（Playwright）

# Supabase
pnpm db:start                # 起動
pnpm db:stop                 # 停止
pnpm db:reset                # DBリセット
pnpm db:types                # 型定義生成
```

---

## プロジェクト構造

```
src/
├── app/                     # Next.js App Router
├── features/                # 機能単位モジュール
│   └── {feature}/
│       ├── api/             # ビジネスロジック、Server Actions
│       ├── components/      # 機能固有コンポーネント
│       ├── hooks/           # 機能固有フック
│       ├── stores/          # Zustand ストア
│       └── types.ts         # 型定義
├── components/              # 共有UIコンポーネント
│   ├── layouts/             # レイアウト系
│   ├── providers/           # コンテキストプロバイダー
│   ├── pwa/                 # PWA関連
│   └── ui/                  # shadcn/ui
└── lib/                     # 共通ライブラリ
    ├── constants/           # 定数
    ├── supabase/            # Supabaseクライアント
    └── types/               # 共通型定義
```

---

## ドキュメント

| パス | 内容 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | AI開発ガイド・技術仕様 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 詳細アーキテクチャ |
| [docs/DESIGN.md](docs/DESIGN.md) | UI/UXデザインガイドライン |
| [docs/PROJECT.md](docs/PROJECT.md) | プロジェクト背景・意思決定 |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 要件定義書 |

---

## 用語

| 用語 | 意味 |
|------|------|
| **ヒビオル** | サービス名。「日々」+「織る」。アニメ映画『さよならの朝に約束の花をかざろう』に登場する、時間と人の営みを織り込む布から |
| **ほつれ** | 継続を守るスキップ機能。布がほつれても修復できるイメージ |
| **ほつれ直し** | ほつれを使って途切れを防ぐこと |

---

## ライセンス

Private
