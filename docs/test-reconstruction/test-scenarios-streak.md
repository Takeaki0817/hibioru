# テストシナリオ: streak

## 概要

ストリーク機能（継続記録）とほつれ（セーフティネット）のテストシナリオを定義する。
仕様書: `.kiro/specs/streak/requirements.md`, `design.md`
ギャップ分析: `gap-analysis-streak.md`

## ユニットテスト

### API関数（Service Layer）

| テスト名 | 対象関数 | テスト内容 | 優先度 | ギャップ |
|---------|---------|-----------|--------|---------|
| `getStreakInfo_初回アクセス` | `getStreakInfo` | レコード未作成時に初期値を返す（current_streak: 0, longest_streak: 0, hotsure_remaining: 2, bonus_hotsure: 0） | P0 | bonus_hotsure |
| `getStreakInfo_既存レコード` | `getStreakInfo` | 既存レコードの値をそのまま返す | P0 | - |
| `getStreakInfo_不正なユーザーID` | `getStreakInfo` | 不正なユーザーIDでDB_ERRORを返す | P1 | - |
| `updateStreakOnEntry_初回記録` | `updateStreakOnEntry` | current_streak が0→1に増加、last_entry_dateが当日に設定される | P0 | - |
| `updateStreakOnEntry_2回目以降` | `updateStreakOnEntry` | 同日に複数記録してもcurrent_streakは1回のみ増加 | P0 | - |
| `updateStreakOnEntry_longest_streak更新` | `updateStreakOnEntry` | current_streakがlongest_streakを超えると、longest_streakが更新される | P0 | - |
| `updateStreakOnEntry_bonus_hotsure含む` | `updateStreakOnEntry` | bonusHotsureが正しく取得・返却される | P1 | bonus_hotsure |
| `updateStreakOnEntry_レコード不在` | `updateStreakOnEntry` | レコード不在時にupsertで新規作成される | P0 | - |
| `updateStreakOnEntry_DB接続エラー` | `updateStreakOnEntry` | DB接続エラーをDB_ERRORで返す | P1 | - |
| `hasEntryOnDate_記録あり` | `hasEntryOnDate` | 指定日に記録がある場合true | P0 | - |
| `hasEntryOnDate_記録なし` | `hasEntryOnDate` | 指定日に記録がない場合false | P0 | - |
| `hasEntryOnDate_削除フラグ` | `hasEntryOnDate` | is_deleted=trueの記録は除外される | P0 | - |
| `hasEntryOnDate_JSTタイムゾーン` | `hasEntryOnDate` | JST基準で日付が正しく判定される（UTC+9） | P0 | - |
| `hasEntryOnDate_日付境界` | `hasEntryOnDate` | 23:59:59と00:00:00の境界でも正しく判定される | P1 | - |
| `breakStreak_途切れ処理` | `breakStreak` | current_streakが0にリセットされる | P0 | - |
| `breakStreak_longest_streak維持` | `breakStreak` | longest_streakは変更されない | P0 | - |
| `breakStreak_DB接続エラー` | `breakStreak` | DB接続エラーをDB_ERRORで返す | P1 | - |
| `getWeeklyRecords_月曜スタート` | `getWeeklyRecords` | 月〜日の7日分を正しく返す | P0 | - |
| `getWeeklyRecords_複数記録日` | `getWeeklyRecords` | 複数記録がある日はtrueになる | P0 | - |
| `getWeeklyRecords_ほつれ表示` | `getWeeklyRecords` | hotsure_used_datesの日付がhotsuresにtrueで返される | P0 | - |
| `getWeeklyRecords_JSTタイムゾーン` | `getWeeklyRecords` | JST基準で日付が正しく判定される | P0 | - |
| `getWeeklyRecords_日付計算精度` | `getWeeklyRecords` | 月末日変わりでも正しく計算される | P1 | - |
| `getWeeklyRecords_レコード不在` | `getWeeklyRecords` | hotsure_used_datesが未作成時は空配列として返される | P0 | - |

**関連ファイル**: `src/features/streak/api/service.ts`

---

### フック（Client Side）

| テスト名 | 対象フック | テスト内容 | 優先度 | ギャップ |
|---------|-----------|-----------|--------|---------|
| `useFlameIntensity_スケール計算_1-3日` | `useFlameIntensity` | currentStreak 1-3 → scale 0.9 | P1 | - |
| `useFlameIntensity_スケール計算_4-7日` | `useFlameIntensity` | currentStreak 4-7 → scale 1.0 | P1 | - |
| `useFlameIntensity_スケール計算_8-14日` | `useFlameIntensity` | currentStreak 8-14 → scale 1.1 | P1 | - |
| `useFlameIntensity_スケール計算_15-30日` | `useFlameIntensity` | currentStreak 15-30 → scale 1.2 | P1 | - |
| `useFlameIntensity_スケール計算_31日以上` | `useFlameIntensity` | currentStreak 31+ → scale 1.3 | P1 | - |
| `useFlameIntensity_スケール計算_0以下` | `useFlameIntensity` | currentStreak 0 → scale 0 | P1 | - |
| `useFlameIntensity_新記録検出` | `useFlameIntensity` | currentStreak === longestStreak && > 0 時にshouldExplode=true | P1 | - |
| `useFlameIntensity_爆発リセット` | `useFlameIntensity` | shouldExplode=trueは100ms後にfalseにリセット | P1 | - |
| `useFlameIntensity_最長記録到達状態追跡` | `useFlameIntensity` | 前回=最短、今回=最長でのみshouldExplode=true | P1 | - |
| `useFlameIntensity_最長記録から外れた` | `useFlameIntensity` | 最長記録を下回ると次回検出のフラグをリセット | P1 | - |
| `useReducedMotion_通常状態` | `useReducedMotion` | prefers-reduced-motionなし → false | P1 | - |
| `useReducedMotion_モーション軽減時` | `useReducedMotion` | prefers-reduced-motion: reduce → true | P1 | - |
| `useReducedMotion_動的変更` | `useReducedMotion` | メディアクエリ変更時に値が更新される | P1 | - |
| `useReducedMotion_SSR対応` | `useReducedMotion` | サーバーレンダリング時はfalseを返す | P1 | - |

**関連ファイル**:
- `src/features/streak/hooks/use-flame-intensity.ts`
- `src/features/streak/hooks/use-reduced-motion.ts`

---

## E2Eテスト

### 正常系（Happy Path）

| テスト名 | ステップ | 期待結果 | 優先度 | 仕様カバー |
|---------|---------|---------|--------|-----------|
| `新規ユーザー初期状態` | 1. ユーザー作成 2. ストリーク表示アクセス | current_streak=0, longest_streak=0, hotsure_remaining=2 | P0 | Req 5.1-5.5 |
| `初回記録でストリーク開始` | 1. 新規ユーザー作成 2. 記録作成 3. ストリーク確認 | current_streak=1, last_entry_date=当日 | P0 | Req 1.1, 1.2 |
| `同日複数記録` | 1. ユーザー作成 2. 記録1作成 3. 記録2作成 4. ストリーク確認 | current_streak=1（変わらず） | P0 | Req 1.4 |
| `翌日記録でストリーク継続` | 1. ユーザー作成 2. 日1に記録 3. 日2に記録 4. ストリーク確認 | current_streak=2 | P0 | Req 1.1 |
| `最長ストリーク更新` | 1. ユーザー作成 2. 5日間毎日記録 3. longest_streak確認 | longest_streak=5 | P0 | Req 1.3 |
| `日付境界跨ぎ` | 1. UTC 15:00 (JST 00:00直前) に記録 2. 時刻進行 3. 翌日記録作成 | 正しく翌日として判定 | P1 | Req 1.5 |
| `ストリーク表示更新` | 1. 日1に記録 2. UIで表示確認 3. 日2に記録 4. UIが更新 | UIのcurrent_streakが増加 | P0 | Req 6.1, 6.2 |
| `最長ストリーク表示` | 1. 5日連続記録後、ストリーク途切れ 2. 再度3日連続記録 | longest_streak=5で固定 | P0 | Req 2.2, 6.2 |
| `週間カレンダー表示` | 1. 月-金に記録 2. UIで週間カレンダー確認 | 記録ありの日が視覚的に識別可能 | P0 | Req 8.4, 8.5 |

---

### 異常系（Error Handling）

| テスト名 | ステップ | 期待結果 | 優先度 | 仕様カバー |
|---------|---------|---------|--------|-----------|
| `ストリーク途切れ_記録なし` | 1. ユーザー作成 2. 日1に記録 3. 日2記録なし 4. 日3にバッチ実行 | current_streak=0 | P0 | Req 2.1 |
| `ストリーク途切れ_longest保持` | 1. 5日連続記録 2. 1日スキップ（ほつれなし） 3. 確認 | longest_streak=5維持、current_streak=0 | P0 | Req 2.2 |
| `ほつれ自動消費_1回目` | 1. ユーザー作成 2. 日1に記録 3. 日2記録なし 4. 日3にバッチ実行 | hotsure_remaining=1（2→1） | P0 | Req 3.1 |
| `ほつれ自動消費_2回目` | 1. 日1に記録 2. 日2記録なし（ほつれ消費） 3. 日3記録なし（ほつれ消費） 4. バッチ実行 | hotsure_remaining=0 | P0 | Req 3.1 |
| `ほつれ使用日記録` | 1. ユーザー作成 2. 日1に記録 3. 日2記録なし（ほつれ消費） 4. 週間記録確認 | hotsure_used_dates に日2が含まれる | P0 | Req 3.2 |
| `ほつれ尽きたらストリーク途切れ` | 1. 日1に記録 2. 日2,3記録なし（ほつれ×2消費） 3. 日4記録なし（ほつれなし） 4. バッチ実行 | current_streak=0、hotsure_remaining=0 | P0 | Req 3.4 |
| `ほつれ消費時current_streak維持` | 1. 日1に記録（current_streak=1） 2. 日2記録なし、ほつれ消費 3. 確認 | current_streak=1維持 | P0 | Req 3.3 |
| `週次ほつれリセット_月曜0:00` | 1. 月-金に各1回ほつれ消費 2. 日曜23:59までに確認（hotsure=0） 3. 月曜0:00にバッチ実行 4. 確認 | hotsure_remaining=2, hotsure_used_dates=[] | P0 | Req 4.1, 4.2 |
| `週次リセット_繰り越しなし` | 1. 金曜時点でhotsure=1（1消費） 2. 月曜0:00にバッチ実行 | hotsure=2（繰り越しなし） | P0 | Req 4.3 |
| `バッチ処理エラー_ユーザースキップ` | 1. ユーザーA,B,Cを作成 2. Bでエラー発生 3. バッチ実行 | AとCは正常処理、Bはスキップ、エラーログ記録 | P1 | Req 7.6 |
| `DB接続エラー_リトライ可能` | 1. API呼び出し中にDB接続一時的に失敗 2. 自動リトライ | エラーハンドリング後に再試行 | P1 | Req 2.3 |
| `未認証アクセス` | 1. 未認証状態で /api/streak にGET | 401 Unauthorized | P0 | Req 6.3 |
| `不正な日付形式` | 1. 認証済みで invalid_date を送信 | 400 Bad Request または INVALID_DATE エラー | P1 | Req 1.5 |

---

### 境界値・エッジケース

| テスト名 | ステップ | 期待結果 | 優先度 | 仕様カバー |
|---------|---------|---------|--------|-----------|
| `JST日付境界_UTC+9` | 1. UTC 15:00 (JST 0:00) 前後で記録作成 | 正しくJST日付で判定 | P1 | Req 1.5, 7.2 |
| `月末日のストリーク` | 1. 1月31日に記録 2. 2月1日に記録 3. ストリーク確認 | 正しく2日分としてカウント | P1 | - |
| `年末年始のストリーク` | 1. 12月31日に記録 2. 1月1日に記録 | 正しく継続としてカウント | P1 | - |
| `うるう年の2月29日` | 1. 2月29日に記録 2. 3月1日に記録（うるう年） | 正しく計算 | P2 | - |
| `ストリーク999日` | 1. 999日連続記録 2. 確認 | current_streak=999 | P2 | - |
| `hotsure_remainingの範囲` | 1. hotsure_remaining の値を確認（0-2） | 必ず 0-2 の範囲内 | P1 | Req 4.4 |
| `bonus_hotsureが0の場合` | 1. ユーザー作成時 2. bonusHotsureを確認 | bonusHotsure=0 | P1 | bonus_hotsure |
| `bonus_hotsureが1以上の場合` | 1. ボーナス付与後 2. bonusHotsureを確認 | 期待値通りに返される | P1 | bonus_hotsure |
| `複数ユーザーの独立性` | 1. ユーザーA,B,C作成 2. 各々異なるパターンで記録 3. 各々のストリーク確認 | 互いに影響しない | P1 | - |
| `大量ユーザーバッチ処理` | 1. 1000ユーザー作成 2. バッチ実行 | 5秒以内に完了 | P2 | - |
| `空の hotsure_used_dates` | 1. 新規ユーザー作成 2. hotsure_used_dates確認 | 空配列 [] | P0 | Req 5.5 |
| `hotsure_used_dates 最大2要素` | 1. 週中にほつれ×2消費 2. hotsure_used_dates確認 | 最大2要素 | P1 | Req 4.4 |
| `NULL values の処理` | 1. 古いレコード（last_entry_date=NULL） 2. バッチ実行 | NULLでも正しく処理 | P1 | - |
| `同時アクセス競合` | 1. 複数リクエストが同時にstreaok更新 | トランザクション保護で1回のみ増加 | P1 | - |

---

## テスト実装パターン

### ユニットテスト（Jest）

```typescript
// example: updateStreakOnEntry_初回記録
describe('updateStreakOnEntry', () => {
  it('should increment current_streak and set last_entry_date on first entry', async () => {
    // Arrange
    const userId = 'test-user-1'
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        }),
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                current_streak: 1,
                longest_streak: 1,
                last_entry_date: '2025-01-17'
              },
              error: null
            })
          })
        })
      })
    }

    // Act
    const result = await updateStreakOnEntry(userId)

    // Assert
    expect(result.ok).toBe(true)
    expect(result.value.currentStreak).toBe(1)
    expect(result.value.lastEntryDate).toBe('2025-01-17')
  })
})
```

### E2Eテスト（Playwright）

```typescript
// example: 新規ユーザー初期状態
test('should initialize streak with default values for new user', async ({ page }) => {
  // Arrange
  await setupNewUser(page)

  // Act
  await page.goto('/streak')

  // Assert
  await expect(page.locator('[data-testid="current-streak"]')).toContainText('0')
  await expect(page.locator('[data-testid="longest-streak"]')).toContainText('0')
  await expect(page.locator('[data-testid="hotsure-remaining"]')).toContainText('2')
})
```

---

## テスト優先度の定義

| 優先度 | 実行タイミング | 内容 |
|--------|--------------|------|
| **P0** | 毎PR | 仕様の核となる機能。動作必須 |
| **P1** | リリース前 | エッジケース、アクセシビリティ、パフォーマンス |
| **P2** | リリース後 | 将来のrefactor時など |

---

## 既知のギャップ

| ギャップ | 対応状況 | テスト影響 |
|---------|--------|----------|
| `bonus_hotsure` 仕様書未記載 | 実装は存在 | P1テストで網羅する |
| 型定義未更新（`database.ts`） | `pnpm db:types`実行予定 | コンパイルエラー要確認 |
| テスト削除済み | ゼロから再構築 | 本ドキュメントで全カバー |

---

## テスト実行コマンド

```bash
# ユニットテスト（新規作成予定）
pnpm test src/features/streak

# E2Eテスト（新規作成予定）
pnpm exec playwright test e2e/streak

# 統合テスト
pnpm test:integration src/features/streak
```

---

## 関連ドキュメント

- 仕様書: `.kiro/specs/streak/requirements.md`
- 設計書: `.kiro/specs/streak/design.md`
- ギャップ分析: `gap-analysis-streak.md`
- テスト規約: `.claude/rules/testing.md`
- E2E戦略: `.claude/rules/e2e-strategy.md`
