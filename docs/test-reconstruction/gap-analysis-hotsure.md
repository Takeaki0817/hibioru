# ギャップ分析レポート: hotsure

## 概要

| 項目 | 状況 |
|------|------|
| 仕様書 | `.kiro/specs/hotsure/requirements.md`, `design.md`, `tasks.md` |
| 実装 | `src/features/hotsure/` |
| 分析日 | 2026-01-17 |

## ギャップ一覧

### 1. 日付判定がUTCを使用 [Critical]

| 項目 | 内容 |
|------|------|
| 仕様 | JST（日本標準時）で日付判定 |
| 実装 | `new Date().toISOString().split('T')[0]` でUTC日付を使用 |
| 優先度 | **高** |
| 影響 | 深夜0時〜9時の間、前日として判定される |

**関連ファイル**: `src/features/hotsure/api/service.ts:72`

```typescript
// 現状（誤り）
const today = new Date().toISOString().split('T')[0]

// 修正案
import { getJSTDateString } from '@/lib/date-utils'
const today = getJSTDateString()
```

**対応案**: `getJSTDateString()` を使用するよう修正

### 2. getDaysUntilNextMondayのタイムゾーン問題

| 項目 | 内容 |
|------|------|
| 仕様 | JSTで次の月曜日までの日数を計算 |
| 実装 | ローカルタイムゾーンを使用 |
| 優先度 | 中 |
| 影響 | サーバー環境によって結果が異なる |

**関連ファイル**: `src/features/hotsure/api/service.ts`

**対応案**: JST固定の日付計算に修正

### 3. テスト未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ユニットテスト・E2Eテスト |
| 実装 | 未実装（削除済み） |
| 優先度 | 高 |
| 影響 | 品質保証 |

## 仕様書更新の必要性

| 項目 | 更新内容 |
|------|---------|
| なし | 仕様書は現状維持（実装を修正） |

## テスト観点

### ユニットテスト

- [ ] `consumeHotsure`: 自動消費ロジック
- [ ] `getHotsureStatus`: 残り数取得
- [ ] `getDaysUntilNextMonday`: 週次リセットまでの日数
- [ ] JST日付境界での動作（0:00〜0:59, 23:00〜23:59）
- [ ] 週次リセット（月曜0:00 JST）

### E2Eテスト

- [ ] ほつれ残り数表示
- [ ] 自動消費フロー（投稿なしで日をまたぐ）
- [ ] 週次リセット後の表示
- [ ] Premiumプランでの付与数増加

## 結論

**日付判定のUTC問題は即時修正が必要**。深夜帯のユーザー操作で意図しない動作が発生する可能性がある。テスト作成時にJST境界ケースを重点的にカバーする。

## 修正コード例

```typescript
// src/features/hotsure/api/service.ts
import { getJSTDateString, getJSTToday } from '@/lib/date-utils'

// 日付判定
const today = getJSTDateString()

// 次の月曜日までの日数
export function getDaysUntilNextMonday(): number {
  const now = getJSTToday()
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  return daysUntilMonday
}
```
