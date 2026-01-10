# Technical Design Document

## Introduction

ほつれ機能の技術設計書。ストリーク継続保護機能として、記録忘れを許容しつつ長期継続を促進する。

### Design Goals

1. **シンプルな自動消費**: ユーザーの意識的な操作なしに保護機能を提供
2. **同時実行安全性**: PostgreSQL FOR UPDATEによる確実なロック
3. **視覚的フィードバック**: 残数に応じた3段階の状態表示
4. **週次サイクル**: 毎週月曜0:00 JSTでのリセット

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Social Page                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           HotsureDisplay                        │    │
│  │  ┌────────────────────────────────────────┐    │    │
│  │  │  残数表示 (0-2) + ステータスアイコン    │    │    │
│  │  │  プログレスバー（糸巻きアイコン）       │    │    │
│  │  │  次回補充までの日数                     │    │    │
│  │  └────────────────────────────────────────┘    │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              TypeScript Service Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │getHotsureInfo│  │canUseHotsure │  │consumeHotsure│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL Functions                      │
│  ┌──────────────────┐  ┌────────────────────────┐       │
│  │  consume_hotsure │  │  reset_hotsure_weekly  │       │
│  │  (FOR UPDATE)    │  │  (pg_cron scheduled)   │       │
│  └──────────────────┘  └────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                  streaks table                          │
│  hotsure_remaining: INTEGER (0-2)                       │
│  hotsure_used_dates: DATE[]                             │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model

### streaks テーブル（ほつれ関連カラム）

| カラム | 型 | デフォルト | 説明 |
|--------|-----|----------|------|
| `hotsure_remaining` | INTEGER | 2 | 無料配分のほつれ残数（0-2）。毎週月曜にリセット |
| `bonus_hotsure` | INTEGER | 0 | 購入したほつれの残数。リセット対象外 |
| `hotsure_used_dates` | DATE[] | {} | 使用日の配列（YYYY-MM-DD） |

### 型定義

```typescript
// src/features/hotsure/types.ts

interface HotsureInfo {
  remaining: number        // 残り回数（0-2）
  usedDates: string[]      // 使用日配列（YYYY-MM-DD形式）
  maxPerWeek: number       // 週あたり最大数（固定: 2）
}

interface ConsumeHotsureResult {
  success: boolean
  remaining?: number       // 消費後の残り回数
  error?: string
}

interface ResetHotsureResult {
  success: boolean
  affectedUsers?: number   // リセット対象ユーザー数
  error?: string
}
```

---

## Components

### HotsureDisplay

**パス**: `src/features/hotsure/components/hotsure-display.tsx`

**Props**:
```typescript
interface HotsureDisplayProps {
  remaining: number  // 現在の残数
  max: number        // 最大数（通常2）
}
```

**状態表示**:

| 状態 | remaining | 色 | アニメーション | メッセージ |
|------|-----------|-----|--------------|----------|
| empty | 0 | danger (赤) | shake | ⚠️ ほつれ切れ！記録を忘れずに |
| warning | 1 | warning (黄) | pulse | ⚡ 残りわずか！計画的に |
| safe | 2 | primary (青) | なし | 安心のセーフティネット |

**CVAバリアント**:
```typescript
// コンテナスタイル
const hotsureContainerVariants = cva('p-5 rounded-xl', {
  variants: {
    status: {
      empty: 'bg-danger-300/20 border-2 border-danger-300',
      warning: 'bg-warning-300/20 border-2 border-warning-300',
      safe: 'bg-primary-100/50',
    },
  },
})

// テキストスタイル
const hotsureTextVariants = cva('', {
  variants: {
    status: {
      empty: 'text-danger-400',
      warning: 'text-warning-400',
      safe: 'text-primary-500',
    },
  },
})
```

**機能**:
- 残数/最大数の表示（例: 1/2）
- 糸巻きアイコン（Spool）によるプログレス表示
- 次の月曜日までの日数計算・表示
- 説明パネル

---

## API Functions

### getHotsureInfo

```typescript
async function getHotsureInfo(userId: string): Promise<HotsureInfo | null>
```

- ユーザーのほつれ情報を取得
- streaksテーブルから`hotsure_remaining`と`hotsure_used_dates`を取得

### canUseHotsure

```typescript
async function canUseHotsure(userId: string): Promise<boolean>
```

- ほつれ使用可否を判定
- 判定条件:
  1. レコードが存在する
  2. `remaining > 0`
  3. 今日まだ使用していない

### consumeHotsure

```typescript
async function consumeHotsure(userId: string): Promise<ConsumeHotsureResult>
```

- PostgreSQL `consume_hotsure` RPCを呼び出し
- 同時実行は FOR UPDATE でロック

### resetHotsureWeekly

```typescript
async function resetHotsureWeekly(): Promise<ResetHotsureResult>
```

- PostgreSQL `reset_hotsure_weekly` RPCを呼び出し
- pg_cronから週次実行される想定

---

## Database Functions

### consume_hotsure(p_user_id UUID)

**パス**: `supabase/migrations/20251217030000_create_consume_hotsure_function.sql`

```sql
CREATE OR REPLACE FUNCTION consume_hotsure(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
```

**処理フロー**:
1. JST基準で今日の日付を取得
2. FOR UPDATE でstreaksレコードをロック
3. 残数チェック（0以下なら失敗）
4. 今日の使用済みチェック（使用済みなら失敗）
5. `hotsure_remaining - 1`、`hotsure_used_dates`に今日を追加
6. 結果をJSONBで返却

**同時実行制御**:
```sql
SELECT hotsure_remaining, hotsure_used_dates
INTO ...
FROM streaks
WHERE user_id = p_user_id
FOR UPDATE;  -- 行レベルロック
```

### reset_hotsure_weekly()

**パス**: `supabase/migrations/20251217040000_create_reset_hotsure_function.sql`

```sql
CREATE OR REPLACE FUNCTION reset_hotsure_weekly()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
```

**処理フロー**:
1. 全ユーザーの`hotsure_remaining = 2`、`hotsure_used_dates = {}`に更新
2. 影響行数を取得
3. batch_logsにsuccess/failedを記録
4. 結果をJSONBで返却

**スケジュール実行**:
```sql
-- pg_cronで毎週月曜0:00 JSTに実行
SELECT cron.schedule(
  'reset-hotsure-weekly',
  '0 0 * * 1',  -- 毎週月曜0:00 UTC（JST 9:00）
  $$SELECT reset_hotsure_weekly()$$
);
```

> **Note**: 実際のcronスケジュールはJST 0:00に合わせて調整が必要

---

## Processing Flow

### 日次バッチでのほつれ自動消費

```
process_daily_streak (毎日0:00 JST)
    │
    ├─ ユーザーごとにループ
    │      │
    │      ├─ 当日の記録があるか確認
    │      │      │
    │      │      ├─ あり → ストリーク継続
    │      │      │
    │      │      └─ なし → ほつれ消費を試行
    │      │              │
    │      │              ├─ hotsure_remaining > 0 → 無料配分を消費
    │      │              │
    │      │              ├─ bonus_hotsure > 0 → 購入分を消費
    │      │              │
    │      │              └─ 両方0 → ストリークリセット
    │      │
    │      └─ 次のユーザーへ
    │
    └─ batch_logsに結果記録
```

**消費優先順位**: 無料配分（hotsure_remaining）→ 購入分（bonus_hotsure）

### 週次リセット

```
reset_hotsure_weekly (毎週月曜0:00 JST)
    │
    ├─ 全ユーザーのhotsure_remaining = 2
    │
    ├─ 全ユーザーのhotsure_used_dates = {}
    │
    └─ batch_logsに結果記録
```

---

## Technology Stack

| カテゴリ | 技術 |
|---------|------|
| コンポーネント | React Client Component |
| アニメーション | framer-motion |
| スタイリング | class-variance-authority (CVA), Tailwind CSS |
| アイコン | Lucide (Spool, Info) |
| 同時実行制御 | PostgreSQL FOR UPDATE |
| スケジュール実行 | pg_cron (Supabase) |

---

## Requirements Traceability

| 要件ID | 実装箇所 |
|--------|---------|
| Req 1 (週次付与) | `reset_hotsure_weekly()` SQL関数 |
| Req 2 (自動消費) | `consume_hotsure()` SQL関数、`process_daily_streak()` |
| Req 3 (同時実行制御) | `consume_hotsure()` の FOR UPDATE |
| Req 4 (状態表示) | `HotsureDisplay` コンポーネント |
| Req 5 (新規ユーザー初期化) | `handle_new_user()` トリガー |

---

## File Structure

```
src/features/hotsure/
├── api/
│   └── service.ts                    # TypeScript API層
├── components/
│   └── hotsure-display.tsx           # 表示コンポーネント
└── types.ts                          # 型定義

supabase/migrations/
├── 20251217030000_create_consume_hotsure_function.sql
├── 20251217040000_create_reset_hotsure_function.sql
└── 20251217070000_schedule_cron_jobs.sql
```
