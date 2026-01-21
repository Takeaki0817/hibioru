# テストシナリオ: timeline

## 概要

timeline機能のテストシナリオ。仕様書（requirements.md, design.md）とギャップ分析に基づいて、実装の品質保証のための包括的なテストケースを定義。

**テスト対象の主要成分**:
- API関数: `fetchEntries`, `fetchCalendarData`, `fetchAllEntryDates`
- フック: `useTimeline`, `useScrollSync`, `useCalendarData`, `useDateCarousel`, `useAllEntryDates`, `useInitialScroll`
- ストア: `TimelineStore` (Zustand)
- コンポーネント: `DateHeader`, `DateCarousel`, `MonthCalendar`, `TimelineList`, `EntryCard`

**既知のギャップ**（テスト時に考慮）:
- 長押しコンテキストメニュー（Req 5.2）: 未実装
- TanStack Virtual: 未実装
- 日付境界スナップアニメーション: 部分実装

---

## ユニットテスト

### API関数

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| fetchEntries: 正常系 | `fetchEntries` | 指定ユーザーの投稿をcreated_at降順で取得 | P0 |
| fetchEntries: カーソルベースページネーション | `fetchEntries` | cursorとdirection(before/after)でページネーション | P0 |
| fetchEntries: 限界値 | `fetchEntries` | limit=50の上限、空配列での動作 | P1 |
| fetchEntries: エラーハンドリング | `fetchEntries` | ネットワークエラー、認証エラー時の例外処理 | P0 |
| fetchAllEntryDates: 全期間日付取得 | `fetchAllEntryDates` | ユーザーの全記録日付を降順で取得 | P0 |
| fetchAllEntryDates: 重複排除 | `fetchAllEntryDates` | 同日複数投稿時に日付は重複なし | P1 |
| fetchCalendarData: 月単位データ | `fetchCalendarData` | 指定月の記録日、ほつれ使用日を取得 | P0 |
| fetchCalendarData: 連続記録判定 | `fetchCalendarData` | isStreakStart, isStreakMiddle, isStreakEndが正しく計算される | P0 |
| fetchCalendarData: 境界月処理 | `fetchCalendarData` | 前月最終日→当月最初の日の連続判定が正確 | P1 |

### フック

| テスト名 | 対象フック | テスト内容 | 優先度 |
|---------|-----------|-----------|--------|
| useTimeline: 初期化と初回フェッチ | `useTimeline` | オプション未指定時に今日のデータを取得 | P0 |
| useTimeline: ページネーション遅延 | `useTimeline` | fetchNextPage/fetchPreviousPage呼び出し時に追加データ取得 | P0 |
| useTimeline: 重複キャッシング | `useTimeline` | 同じcursorで重複取得しない | P1 |
| useTimeline: エラー状態 | `useTimeline` | isError=trueときrefetch()で再試行可能 | P0 |
| useTimeline: 空レスポンス処理 | `useTimeline` | entries=[]、hasNextPage=falseの正しい反映 | P1 |
| useScrollSync: 日付算出 | `useScrollSync` | 現在スクロール位置から日付を正確に抽出 | P0 |
| useScrollSync: 日付変更検出 | `useScrollSync` | 日付が変わるとonDateChangeコールバック発火 | P0 |
| useScrollSync: スナップアニメーション判定 | `useScrollSync` | isSnapping=trueで追加スクロール処理を無視 | P1 |
| useCalendarData: データ構造 | `useCalendarData` | CalendarDayData配列が月の全日（1-31）を含む | P0 |
| useCalendarData: キャッシュ有効性 | `useCalendarData` | 同じyear/monthで複数呼び出しはキャッシュ利用 | P1 |
| useDateCarousel: スクロール制御 | `useDateCarousel` | scrollToDate()で指定日付がカルーセル中央に | P0 |
| useDateCarousel: 表示インデックス取得 | `useDateCarousel` | getVisibleDateIndex()で現在表示中の日付インデックス返却 | P1 |
| useAllEntryDates: 日付配列 | `useAllEntryDates` | YYYY-MM-DD形式の降順配列を返却 | P0 |
| useInitialScroll: 初期位置設定 | `useInitialScroll` | マウント時に今日の最終投稿位置へスクロール | P0 |
| useInitialScroll: 待機処理 | `useInitialScroll` | DOM準備完了までWAIT_FOR_DOM_MSで待機 | P1 |

### ストア

| テスト名 | 対象ストア | テスト内容 | 優先度 |
|---------|-----------|-----------|--------|
| TimelineStore: カレンダー開閉状態 | `TimelineStore` | setCalendarOpen(true/false)で状態更新 | P0 |
| TimelineStore: アクティブ日付更新 | `TimelineStore` | setActiveDates()で複数日付をSet<string>で管理 | P0 |
| TimelineStore: syncSource追跡 | `TimelineStore` | setActiveDates(dates, source)でソース('scroll'/'carousel'/'calendar')を記録 | P1 |
| TimelineStore: リセット機能 | `TimelineStore` | reset()で初期状態に戻る | P1 |
| TimelineStore: 非同期購読 | `TimelineStore` | useTimelineStore()で状態変更を即座に反映 | P0 |

---

## E2Eテスト

### 正常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| ページロード基本 | 1. `/`にアクセス | タイムラインが表示、今日の投稿が見える | P0 |
| 初期スクロール位置 | 1. ページロード<br>2. スクロール位置確認 | 一番下（最新の投稿）に自動スクロール | P0 |
| 単一投稿表示 | 1. 投稿が1件の場合アクセス<br>2. 投稿内容確認 | テキスト・画像（ある場合）・時刻が表示 | P0 |
| 複数投稿表示 | 1. 投稿が3件以上の場合アクセス<br>2. 順序確認 | 新しい順（上が新しい）で並ぶ | P0 |
| 連続スクロール | 1. ページロード<br>2. 上にスクロール<br>3. さらに上へ | 日付をまたいで連続スクロール可能 | P0 |
| 日付ヘッダー同期 | 1. ページロード<br>2. スクロール中に日付観察 | スクロール位置の投稿の日付がヘッダーに反映 | P0 |
| 日付ヘッダー更新 | 1. ページロード<br>2. 日付1を表示している状態<br>3. スクロール<br>4. 日付2表示 | ヘッダーが即座に日付1→日付2に更新 | P0 |
| カレンダー展開 | 1. ページロード<br>2. カレンダーアイコンタップ | 月カレンダーが展開表示 | P0 |
| カレンダー日付選択 | 1. カレンダー展開<br>2. 過去の日付（●表示）をタップ | その日付の投稿位置へスクロール | P0 |
| カレンダー記録表示 | 1. カレンダー展開<br>2. 記録日確認 | ●マークが記録ある日に表示 | P0 |
| カレンダー継続線表示 | 1. カレンダー展開<br>2. 連続記録日確認 | 連続する日に━━表示（接続） | P1 |
| カレンダーほつれ表示 | 1. カレンダー展開<br>2. ほつれ使用日確認 | 🧵マークが表示 | P1 |
| カレンダー今日強調 | 1. カレンダー展開<br>2. 本日日付確認 | ◎マークで強調表示 | P0 |
| カレンダー閉じる | 1. カレンダー展開<br>2. カレンダー外の領域をタップ | カレンダーが閉じる | P0 |
| 無限スクロール上 | 1. ページロード<br>2. 上へ繰り返しスクロール | 過去のデータが追加読み込みされる | P0 |
| 投稿カード編集遷移 | 1. ページロード<br>2. 投稿カードをタップ | `/edit/[id]`ページへ遷移 | P0 |
| 投稿カード画像表示 | 1. 画像付き投稿をタップ<br>2. 画像確認 | 投稿に画像が表示される（拡大なし） | P0 |
| 日付ヘッダーカルーセル | 1. ページロード<br>2. 日付カルーセル左右スクロール | 記録がある日付が横スクロール表示 | P0 |
| カルーセル日付選択 | 1. ページロード<br>2. カルーセルで別の日付をタップ | その日付の投稿位置へスクロール | P0 |
| ほつれマーク表示 | 1. ページロード<br>2. ほつれ使用日を確認 | 日付ヘッダーのカルーセルに🧵表示 | P1 |
| 複数デバイス対応 | 1. モバイル(375px)でアクセス<br>2. タブレット(768px)でアクセス<br>3. デスクトップ(1024px)でアクセス | 全デバイスで適切に表示・操作可能 | P0 |

### 異常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| 投稿なし時 | 1. 投稿が0件のユーザーでアクセス | 空状態UIが表示 | P0 |
| ネットワークエラー | 1. ネットワーク接続なしの状態でアクセス | エラーメッセージとリトライボタン表示 | P0 |
| データ取得失敗 | 1. API失敗をシミュレート<br>2. ページリロード | エラーメッセージ、リトライボタン表示 | P0 |
| 認証なし | 1. ログアウト状態でアクセス | ログインページへリダイレクト | P0 |
| 不正なカレンダー年月 | 1. URLで不正な年月を指定<br>2. 月カレンダー展開 | エラーハンドリング、フォールバック表示 | P1 |
| スクロール位置不正 | 1. 大量スクロール中にデータ削除<br>2. スクロール位置確認 | アプリがクラッシュせず、今日へリセット | P1 |
| 画像読み込み失敗 | 1. 画像URLが無効な投稿を表示 | 代替テキスト表示、投稿内容は表示 | P1 |

### 境界値・エッジケース

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| 単一投稿 | 1. 全期間でたった1件の投稿でアクセス | 投稿が表示、ナビゲーション正常 | P1 |
| 1000件超投稿 | 1. 1000件以上の投稿があるユーザーでアクセス | スクロール性能低下なし（≥55fps） | P1 |
| 年をまたぐ連続記録 | 1. 12月末から1月初めまで記録<br>2. カレンダーで境界確認 | 月をまたぐ連続判定が正確 | P1 |
| 特殊文字含む投稿 | 1. 絵文字、改行を含む投稿<br>2. 表示確認 | 正しくレンダリング | P1 |
| 最大文字数投稿 | 1. 1000文字（上限）の投稿を表示 | テキスト全体が表示、トリミングなし | P1 |
| 複数画像投稿 | 1. 複数画像（2-5枚）を含む投稿<br>2. スクロール | 全画像が表示される | P1 |
| 空白のみの投稿 | 1. スペースのみの投稿を表示 | 投稿は表示される（内容は空に見える） | P2 |
| 月の最終日から最初の日へ | 1. 1月31日の投稿を表示<br>2. スクロール<br>3. 2月1日表示 | スムースに日付移行、日付ヘッダー更新 | P1 |
| 今日の投稿が複数 | 1. 本日投稿が3件以上<br>2. 初期スクロール位置確認 | 今日の最終投稿に自動スクロール | P0 |
| ほつれ使用日 | 1. ほつれを使用した日を表示<br>2. カレンダーで確認 | 🧵マークが表示 | P1 |
| 未来日付クエリ | 1. まだ来ていない日付をカレンダーで選択 | スクロールまたはエラー表示 | P2 |
| 超高速スクロール | 1. マウスホイールで急速スクロール<br>2. 日付検出確認 | 日付が正確に検出される（デバウンス確認） | P1 |
| カレンダー月移動 | 1. カレンダー展開<br>2. 前月→当月→翌月と移動<br>3. 各月のデータ確認 | 月ごとのデータが正確に読み込まれ、キャッシュ機能 | P1 |
| 戻る・進むジェスチャー | 1. デバイスの戻るボタン押下<br>2. 前ページから戻る | タイムラインの前回スクロール位置を復元 | P1 |

---

## テスト実装優先度

### Phase 1（必須 - P0/P1）
1. API関数のユニットテスト（fetchEntries, fetchCalendarData）
2. useTimeline, useScrollSyncフック
3. 正常系E2E（ページロード、スクロール、カレンダー）
4. 異常系E2E（エラーハンドリング、認証）

### Phase 2（重要 - P1）
1. フック: useCalendarData, useDateCarousel, useInitialScroll
2. ストア: TimelineStore状態管理
3. エッジケース: 複数投稿、連続記録、月境界

### Phase 3（改善 - P1/P2）
1. パフォーマンステスト（1000件投稿）
2. 境界値テスト（特殊文字、最大文字数）
3. 未実装機能対応後のテスト（長押しコンテキストメニュー、TanStack Virtual）

---

## テスト実装時の注意点

### ギャップ対応

1. **長押しコンテキストメニュー（Req 5.2）**
   - 現在未実装のため、E2Eテストでは除外
   - 実装完了後に`useEntry-card-long-press`テストスイートを追加

2. **TanStack Virtual**
   - 仮想スクロール未実装のため、DOM全体が存在
   - 大量投稿（1000件超）テストは実装後に有効
   - 現在は「通常スクロール性能」テストのみ実施

3. **日付境界スナップアニメーション**
   - IntersectionObserverで日付検出は実装済み
   - スナップアニメーション自体は未実装
   - テスト時は「日付変更が検出される」を確認、スナップは検証対象外

### テストデータ準備

```typescript
// テスト用フィクスチャ
export const TEST_USER_ID = 'test-user-001'

export const MOCK_ENTRIES = [
  {
    id: '1',
    userId: TEST_USER_ID,
    content: '今日も頑張った',
    imageUrls: null,
    createdAt: new Date('2026-01-17T14:30:00+09:00'),
    date: '2026-01-17',
  },
  // ... more entries
]

export const MOCK_CALENDAR_DATA = {
  days: [
    { date: '2026-01-01', hasEntry: true, hasHotsure: false, isToday: false, /* ... */ },
    // ... more days
  ]
}
```

### モック戦略

- **Supabase**: `@supabase/supabase-js`をモック
- **TanStack Query**: `@tanstack/react-query`のtestingユーティリティ使用
- **Router**: `next/navigation`をモック（`useRouter`）
- **日付**: `vi.setSystemTime()`でシステム時刻を固定

### パフォーマンス測定

```typescript
// Lighthouse/Core Web Vitals確認
test('初期ロードが3秒以内', async () => {
  const start = performance.now()
  await navigateToTimeline()
  const duration = performance.now() - start
  expect(duration).toBeLessThan(3000)
})

// スクロールFPS（DevToolsで確認）
// 目標: ≥ 55fps（60fps理想）
```

---

## テストケース実装チェックリスト

### ユニットテスト
- [ ] API関数: fetchEntries（5テスト）
- [ ] API関数: fetchCalendarData（3テスト）
- [ ] フック: useTimeline（5テスト）
- [ ] フック: useScrollSync（3テスト）
- [ ] フック: useCalendarData（2テスト）
- [ ] フック: useDateCarousel（2テスト）
- [ ] フック: useInitialScroll（2テスト）
- [ ] ストア: TimelineStore（5テスト）

**計: 29テストケース**

### E2Eテスト
- [ ] 正常系: 23テストケース
- [ ] 異常系: 6テストケース
- [ ] 境界値・エッジケース: 13テストケース

**計: 42テストケース**

---

## 参考ファイル

| ファイル | 用途 |
|---------|------|
| `.kiro/specs/timeline/requirements.md` | 仕様書（Req 1-7） |
| `.kiro/specs/timeline/design.md` | 技術設計書 |
| `src/features/timeline/api/queries.ts` | API関数実装 |
| `src/features/timeline/hooks/` | フック実装群 |
| `src/features/timeline/stores/timeline-store.ts` | ストア実装 |
| `src/features/timeline/components/` | コンポーネント実装 |
| `docs/test-reconstruction/gap-analysis-timeline.md` | ギャップ分析 |
