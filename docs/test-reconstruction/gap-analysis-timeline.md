# ギャップ分析レポート: timeline

## 概要

| 項目 | 状況 |
|------|------|
| 仕様書 | `.kiro/specs/timeline/requirements.md`, `design.md`, `tasks.md` |
| 実装 | `src/features/timeline/` |
| 分析日 | 2026-01-17 |

## ギャップ一覧

### 1. 長押しコンテキストメニュー 未実装 [Critical]

| 項目 | 内容 |
|------|------|
| 仕様 | Req 5.2: エントリカードの長押しでコンテキストメニュー表示 |
| 実装 | **未実装** |
| 優先度 | 高 |
| 影響 | モバイルUX、仕様との乖離 |

**関連ファイル**: `src/features/timeline/components/entry-card.tsx`

**対応案**:
- `useLongPress` フックを実装
- コンテキストメニューコンポーネントを追加
- 編集・削除・共有オプションを提供

### 2. TanStack Virtual 未実装

| 項目 | 内容 |
|------|------|
| 仕様 | design.md: TanStack Virtualによる仮想スクロール |
| 実装 | 通常のリストレンダリング |
| 優先度 | 中 |
| 影響 | 大量エントリ時のパフォーマンス |

**関連ファイル**: `src/features/timeline/components/timeline-list.tsx`

**対応案**: TanStack Virtualを導入し、仮想スクロールを実装

### 3. 日付境界スナップアニメーション 部分実装

| 項目 | 内容 |
|------|------|
| 仕様 | スクロール停止時に日付境界へスナップ |
| 実装 | IntersectionObserverによる日付検出は実装済み、スナップは未実装 |
| 優先度 | 低 |
| 影響 | UXの洗練度 |

**関連ファイル**:
- `src/features/timeline/hooks/use-date-detection.ts`
- `src/features/timeline/components/timeline-list.tsx`

### 4. 型定義の不一致

| 項目 | 内容 |
|------|------|
| 仕様 | `activeDates: string[]` |
| 実装 | `activeDates: Set<string>` |
| 優先度 | 低 |
| 影響 | 型の一貫性 |

**対応案**: 仕様書を実装に合わせて更新（Setの方が効率的）

### 5. テスト未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ユニットテスト・E2Eテスト |
| 実装 | 未実装（削除済み） |
| 優先度 | 高 |
| 影響 | 品質保証 |

## 仕様書更新の必要性

| 項目 | 更新内容 |
|------|---------|
| activeDates型 | `string[]` → `Set<string>` に更新 |
| TanStack Virtual | 実装ステータスを「将来対応」に変更、または実装 |

## テスト観点

### ユニットテスト

- [ ] `use-timeline.ts`: データフェッチ・ページネーション
- [ ] `use-date-detection.ts`: 日付検出ロジック
- [ ] `use-timeline-grouping.ts`: エントリグルーピング
- [ ] 日付計算（JST）

### E2Eテスト

- [ ] タイムライン表示
- [ ] 無限スクロール
- [ ] 日付ナビゲーション（カレンダー連携）
- [ ] エントリカードのインタラクション
- [ ] 空状態の表示

## 結論

**長押しコンテキストメニュー（Req 5.2）が未実装**は重大なギャップ。仕様通りの実装が必要か、仕様書から削除するかの判断が必要。TanStack Virtualはパフォーマンス問題が顕在化してから対応でも可。
