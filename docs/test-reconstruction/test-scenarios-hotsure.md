# テストシナリオ: hotsure

## 概要

ほつれ機能の包括的テストシナリオ。仕様書（Requirements, Design）に基づき、ユニットテスト・E2Eテストを体系化した。

**特に注意**: ギャップ分析で指摘された日付判定のバグ（UTC vs JST）を検出するテストを重点的に含める。

---

## ユニットテスト

### API関数（service.ts）

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| `getHotsureInfo-基本系` | `getHotsureInfo()` | ユーザーのほつれ情報を正常に取得できる | 高 |
| `getHotsureInfo-ユーザーなし` | `getHotsureInfo()` | ユーザーが存在しない場合nullを返す | 高 |
| `getHotsureInfo-型の検証` | `getHotsureInfo()` | 戻り値の型（remaining, usedDates, maxPerWeek）が正しい | 高 |
| `canUseHotsure-使用可能` | `canUseHotsure()` | remaining>0かつ今日未使用ならtrue | 高 |
| `canUseHotsure-残り0` | `canUseHotsure()` | remaining=0ならfalse | 高 |
| `canUseHotsure-今日使用済み` | `canUseHotsure()` | usedDatesに今日が含まれるならfalse | 高 |
| `canUseHotsure-ユーザーなし` | `canUseHotsure()` | ユーザーが存在しないならfalse | 高 |
| `canUseHotsure-UTC日付バグ検出` | `canUseHotsure()` | **[Critical]** JST 0:00-9:00の時間帯で日付判定がUTC（前日）になるバグを検出 | 高 |
| `consumeHotsure-成功` | `consumeHotsure()` | RPC呼び出しに成功し、残り回数を返す | 高 |
| `consumeHotsure-失敗-RpcエラーCatch` | `consumeHotsure()` | Supabase RPC呼び出しが失敗したとき、エラーメッセージを返す | 高 |
| `consumeHotsure-失敗-業務ロジックエラー` | `consumeHotsure()` | RPC内の業務ロジック（残り0など）でエラーが返ってきたとき、success:falseを返す | 高 |
| `resetHotsureWeekly-成功` | `resetHotsureWeekly()` | RPC呼び出しに成功し、影響を受けたユーザー数を返す | 高 |
| `resetHotsureWeekly-失敗` | `resetHotsureWeekly()` | RPC呼び出しが失敗したとき、エラーメッセージを返す | 高 |

### 日付関連ユーティリティ

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| `getDaysUntilNextMonday-月曜日0日` | `getDaysUntilNextMonday()` | 月曜日なら次の月曜日までの日数（7日）を返す | 高 |
| `getDaysUntilNextMonday-火〜日` | `getDaysUntilNextMonday()` | 各曜日（火〜日）から月曜日までの日数を正しく計算 | 高 |
| `getDaysUntilNextMonday-タイムゾーン` | `getDaysUntilNextMonday()` | **[Critical]** JST基準の計算であること。ローカルタイムゾーンに依存しない（serverenv, UA等） | 高 |
| `getDaysUntilNextMonday-例: 金曜日は3日` | `getDaysUntilNextMonday()` | 金曜日（dayOfWeek=5）なら3日を返す（8-5=3） | 中 |
| `getDaysUntilNextMonday-例: 日曜日は1日` | `getDaysUntilNextMonday()` | 日曜日（dayOfWeek=0）なら1日を返す | 中 |

### コンポーネント（HotsureDisplay）

| テスト名 | 対象コンポーネント | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| `HotsureDisplay-残り2（safe）` | `HotsureDisplay` | remaining=2のとき、blue色、通常表示、メッセージ「安心のセーフティネット」 | 高 |
| `HotsureDisplay-残り1（warning）` | `HotsureDisplay` | remaining=1のとき、yellow色、pulse animation、⚡アイコン、「残りわずか」 | 高 |
| `HotsureDisplay-残り0（empty）` | `HotsureDisplay` | remaining=0のとき、red色、shake animation、⚠️アイコン、「ほつれ切れ」 | 高 |
| `HotsureDisplay-残り数表示` | `HotsureDisplay` | 残り数/最大数が正しく表示される（例: 1/2） | 高 |
| `HotsureDisplay-スプールアイコン` | `HotsureDisplay` | maxに応じてSpoolアイコンが描画される（2個の場合、2つ表示） | 高 |
| `HotsureDisplay-プログレス反映` | `HotsureDisplay` | remaining個のアイコンが色付き、残りが薄い表示 | 高 |
| `HotsureDisplay-次回補充日数` | `HotsureDisplay` | getDaysUntilNextMonday()から取得した日数が正しく表示される | 高 |
| `HotsureDisplay-説明テキスト` | `HotsureDisplay` | 「毎週月曜日に2回まで自動補充」の説明が表示される | 中 |
| `HotsureDisplay-アニメーション実行` | `HotsureDisplay` | status=emptyでshake、status=warningでpulseアニメーション | 中 |

---

## E2Eテスト

### 正常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| `E2E-ほつれ初期表示` | 1. ユーザーがログイン 2. ソーシャルページを開く | ほつれ表示が見える、初期状態のほつれ残数（通常2）が表示される | 高 |
| `E2E-ほつれ状態遷移-2→1` | 1. 初期状態: 残り2 2. 記録なしで日をまたぐ（バッチ処理実行） 3. 次日ほつれ確認 | 残り数が1に減少、ステータスが警告（yellow）に遷移 | 高 |
| `E2E-ほつれ状態遷移-1→0` | 1. 状態: 残り1 2. 記録なしで日をまたぐ 3. 次日確認 | 残り数が0に減少、ステータスが危険（red）に遷移 | 高 |
| `E2E-ほつれ状態遷移-0→リセット` | 1. 状態: 残り0（ストリーク消費済み） 2. 月曜日0:00 JSTを迎える 3. 週次リセット後確認 | 残り数が2に戻る、ステータスが安全（blue）に戻る | 高 |
| `E2E-ほつれ非消費-記録あり` | 1. 初期状態: 残り2 2. 当日に記録を投稿 3. 日をまたぐ | ほつれが消費されない、残り数は2のまま | 高 |
| `E2E-ほつれ消費スキップ-既に使用済み` | 1. 状態: 残り2、今日使用済み 2. 日をまたぐ | ほつれが重複消費されない（1回のみ消費） | 高 |
| `E2E-次回補充日数-金曜日` | 1. 金曜日にソーシャルページを開く | 「次の補充まで 3日」が表示される | 中 |
| `E2E-次回補充日数-日曜日` | 1. 日曜日にソーシャルページを開く | 「次の補充まで 1日」が表示される | 中 |
| `E2E-次回補充日数-月曜日` | 1. 月曜日にソーシャルページを開く | 「次の補充まで 7日」が表示される | 中 |

### 異常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| `E2E-ほつれ取得失敗` | 1. DBエラー発生時 2. ソーシャルページ読み込み | ほつれ表示はスケルトン状態、またはエラーメッセージ | 中 |
| `E2E-ほつれ消費失敗-DB競合` | 1. 同時に複数のリクエストで消費を試行 2. FOR UPDATEのロック機構をテスト | 1回のみ消費される、二重消費は発生しない | 高 |
| `E2E-ストリーク切れでほつれ消費なし` | 1. ほつれ残り0、bonus_hotsure=0の状態 2. 記録なしで日をまたぐ 3. ストリーク状態確認 | current_streakが0にリセットされる、ほつれは消費されない | 高 |
| `E2E-bonus_hotsureの消費` | 1. hotsure_remaining=0 2. bonus_hotsure>0 3. 記録なしで日をまたぐ | bonus_hotsureから1つ消費される、ストリークは継続 | 高 |

### 境界値・エッジケース（JST日付境界）

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| `E2E-JST深夜0:00-9:00時点でのほつれ消費判定` | 1. JST深夜 0:00-9:00 2. 前日の記録なし 3. ほつれ消費可否判定 | **[Critical Bug Test]** `getJSTDateString()`が使用されており、UTC日付ではなくJST日付で判定される。UTC判定だと前日として誤認識される | 高 |
| `E2E-UTC 15:00-23:59時点のほつれ消費` | 1. UTC時刻 15:00-23:59（JST未来） 2. ほつれ消費判定 | 当日（JST）として判定される | 高 |
| `E2E-月曜0:00 JST境界でのリセット` | 1. 日曜23:59:59 2. 月曜0:00:00 JSTになる 3. バッチ処理実行 | 月曜0:00時点でリセットが実行される（UTC-9の変換が正しい） | 高 |
| `E2E-日付フォーマット-YYYY-MM-DD` | 1. ほつれ使用日を確認 2. usedDatesの形式をチェック | 常に YYYY-MM-DD 形式（例: 2026-01-17） | 中 |
| `E2E-canUseHotsure-UTC vs JST` | 1. JST深夜0:00-9:00で当日記録チェック 2. usedDatesに含まれるか確認 | **[Critical Bug Test]** JST日付で判定。実装が UTC判定の場合、前日が含まれていなくても、今日として誤って使用可能と判定される | 高 |
| `E2E-複数日のほつれ消費記録` | 1. 月曜日に消費（usedDates=[2026-01-13]） 2. 火曜日に消費（usedDates=[2026-01-13, 2026-01-14]） 3. 水曜日に消費（usedDates=[2026-01-13, 2026-01-14, 2026-01-15]） | 各日の消費が正しく記録される、重複なし | 中 |
| `E2E-タイムゾーン環境差による動作` | 1. サーバー: UTC、クライアント: JST環境で実行 2. 日付判定とほつれ消費 | JST基準で統一される（サーバー側の日付取得ロジックが JST を使用） | 中 |

---

## 実装テスト時の注意点

### Critical Bug: UTC vs JST

**現在の実装の問題**:

```typescript
// src/features/hotsure/api/service.ts:72
const today = new Date().toISOString().split('T')[0]  // UTC日付 ❌
```

**テスト例**:
- **JST 2026-01-17 01:00** (UTC 2026-01-16 16:00)
  - 期待: JST日付 `2026-01-17` で判定
  - 実装ではUTC日付 `2026-01-16` で判定される
  - 結果: 今日の記録なしでほつれを消費すべきなのに、昨日に使用済みと誤認識される可能性

**修正コード**:

```typescript
import { getJSTDateString } from '@/lib/date-utils'

const today = getJSTDateString()  // JST日付 ✓
```

### getDaysUntilNextMonday のタイムゾーン問題

**現在の実装**:

```typescript
// src/features/hotsure/components/hotsure-display.tsx:47-54
function getDaysUntilNextMonday(): number {
  const today = new Date()  // ローカルタイムゾーン ❌
  const dayOfWeek = today.getDay()
  const daysUntil = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7
  return daysUntil === 0 ? 7 : daysUntil
}
```

**問題**:
- サーバー環境では UTC で計算される（JST では計算されない）
- ローカル開発（JST）では動作するが、本番（UTC）で結果が異なる

**テスト例**:
- **日曜日 JST**
  - 期待: 次の月曜日は 1 日後
  - 本番（UTC）で実行: 異なる曜日として計算される可能性

**修正コード**:

```typescript
import { getJSTToday } from '@/lib/date-utils'

function getDaysUntilNextMonday(): number {
  const now = getJSTToday()  // JST固定 ✓
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  return daysUntilMonday
}
```

---

## テスト実装のテンプレート例

### ユニットテスト（Jest）

```typescript
// src/features/hotsure/__tests__/service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as service from '../api/service'
import { getJSTDateString } from '@/lib/date-utils'

describe('hotsure/service', () => {
  describe('canUseHotsure', () => {
    it('remaining > 0 かつ未使用なら true', async () => {
      const result = await service.canUseHotsure('test-user-id')
      expect(result).toBe(true)
    })

    it('remaining = 0 なら false', async () => {
      const result = await service.canUseHotsure('exhausted-user-id')
      expect(result).toBe(false)
    })

    // Critical: UTC vs JST バグ検出テスト
    it('[Critical] JST深夜での日付判定がUTCになるバグを検出', async () => {
      // モック: JST 2026-01-17 02:00（UTC 2026-01-16 17:00）
      // usedDates に「2026-01-16」が入っている場合、
      // UTC判定なら false（今日は 2026-01-16）
      // JST判定なら true（今日は 2026-01-17）

      const result = await service.canUseHotsure('user-jst-midnight-test')
      // JST基準なら true
      expect(result).toBe(true)
    })
  })

  describe('getDaysUntilNextMonday', () => {
    it('月曜日なら 7 日', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-13T00:00:00+09:00')) // 月曜日

      const days = service.getDaysUntilNextMonday()
      expect(days).toBe(7)

      vi.useRealTimers()
    })

    it('[Critical] JST基準で計算されている', () => {
      // サーバー（UTC）でも正しく計算される
      // ローカルタイムゾーンに依存しない
      expect(true).toBe(true) // Placeholder
    })
  })
})
```

### E2Eテスト（Playwright）

```typescript
// e2e/hotsure.spec.ts

import { test, expect } from '@playwright/test'
import { setupTestSession, TEST_USERS } from './fixtures/test-helpers'

test.describe('hotsure E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestSession(page, TEST_USERS.PRIMARY.id)
  })

  test('ほつれ表示が見える', async ({ page }) => {
    await page.goto('/social')
    const hotsureCard = page.locator('[data-testid="hotsure-display"]')
    await expect(hotsureCard).toBeVisible()
  })

  test('[Critical] JST深夜でのほつれ消費判定', async ({ page }) => {
    // JST 0:00-9:00 の時間帯で記録なしでほつれが消費される
    // UTC判定の場合、前日として誤認識される

    await page.goto('/social')
    const initialRemaining = await page.locator('[data-testid="hotsure-remaining"]').textContent()

    // バッチ処理をシミュレート（または実際に日をまたぐ）
    // ...

    const afterRemaining = await page.locator('[data-testid="hotsure-remaining"]').textContent()
    expect(Number(afterRemaining)).toBe(Number(initialRemaining) - 1)
  })

  test('月曜0:00 JSTでリセット', async ({ page }) => {
    // 月曜日0:00 JST に reset_hotsure_weekly が実行される
    // 前日の日曜23:59 と月曜0:00 の境界で動作を確認
    expect(true).toBe(true) // Placeholder
  })
})
```

---

## テスト優先度の整理

| 優先度 | 観点 | テスト数 |
|--------|------|---------|
| 高 | 基本機能、Critical Bug検出、同時実行制御 | 25+ |
| 中 | 境界値、補助情報表示 | 10+ |
| 低 | 見た目・アニメーション詳細 | 5+ |

**実装順序**:
1. ユニットテスト（API関数、日付ユーティリティ）→ **Critical Bug を早期検出**
2. E2E正常系（ほつれ表示、消費フロー）
3. E2E異常系・境界値（特にJST/UTC関連）

---

## チェックリスト

実装時には以下を確認：

- [ ] `canUseHotsure()` で `getJSTDateString()` を使用（UTC 判定を削除）
- [ ] `getDaysUntilNextMonday()` で `getJSTToday()` を使用（ローカルタイムゾーン依存を削除）
- [ ] テスト環境で UTC と JST の両方をテスト
- [ ] バッチ処理（`process_daily_streak()`）で消費優先順位を確認（無料 → 購入）
- [ ] FOR UPDATE ロックによる同時実行制御を確認
- [ ] 型定義が実装と一致していることを確認
