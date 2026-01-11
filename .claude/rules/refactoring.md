# リファクタリング規約

## 基本原則

- **役割・意味が同じ** 処理のみを共通化する
- 処理が似ているだけでの共通化は避ける（後の変更で支障をきたす）
- 過度な抽象化より、明示的で理解しやすいコードを優先

## 共通化すべきもの

### 型定義

```typescript
// 複数フィーチャーで使用される汎用型は src/lib/types/ へ
// 例: Result型、共通エラー型

// src/lib/types/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

### ユーティリティ関数

```typescript
// 複数フィーチャーで使用されるユーティリティは src/lib/ へ
// 例: 日付処理、フォーマット関数

// src/lib/date-utils.ts
export function getJSTDateString(date: Date = new Date()): string
export function getJSTDayBounds(referenceDate?: Date): { start: Date; end: Date }
```

### 定数

```typescript
// フィーチャー固有の定数は各フィーチャーの constants.ts へ
// src/features/{feature}/constants.ts

export const TIMELINE_CONFIG = {
  DATES_PER_PAGE: 5,
  STALE_TIME_MS: 10 * 60 * 1000,
} as const

// TanStack Query の queryKey は src/lib/constants/query-keys.ts へ
export const queryKeys = {
  entries: {
    all: ['entries'] as const,
    timeline: (userId: string) => [...queryKeys.entries.all, 'timeline', userId] as const,
  },
} as const
```

## メモ化すべきもの

React Compiler を使用していても、以下は明示的なメモ化が有効：

### useMemo

```typescript
// 複数の連続した useMemo は1つに統合
// Before: 6つの独立した useMemo
const entryDays = useMemo(() => days.filter(...), [days])
const streakDays = useMemo(() => days.filter(...), [days])

// After: 1つに統合（依存配列チェック削減）
const categories = useMemo(() => ({
  entryDays: days.filter(...),
  streakDays: days.filter(...),
}), [days])

// 重い計算（toLocaleTimeString等）
const timeLabel = useMemo(() =>
  date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
  [date]
)
```

### useCallback

```typescript
// イベントハンドラーは useCallback で安定化
const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
  [setValue]
)

// IntersectionObserver/MutationObserver のコールバック
const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
  // ...
}, [dependencies])
```

### React.memo

```typescript
// map内で複雑なロジックを持つ子コンポーネント
const ListItem = memo(function ListItem({ item, onSelect }: Props) {
  const handleClick = useCallback(() => onSelect(item.id), [onSelect, item.id])
  return <button onClick={handleClick}>{item.name}</button>
})
```

## 責務分離

### 大きなコンポーネントの分割

500行を超えるコンポーネントは責務ごとにカスタムフックへ分離：

```typescript
// Before: timeline-list.tsx (600+ 行)
// - IntersectionObserver管理
// - スクロール時日付検出
// - ページネーション
// - UI表示

// After: 責務ごとにフック分離
// hooks/use-infinite-scroll.ts - Observer管理
// hooks/use-date-detection.ts - 日付検出
// timeline-list.tsx - UI表示のみ
```

### フック分離の基準

1. **独立したライフサイクル**: 別々の useEffect で管理される処理
2. **再利用可能性**: 他のコンポーネントでも使える汎用的なロジック
3. **テスト容易性**: 単独でテストしたいロジック

## 共通化しないもの

- フィーチャー固有のエラー型（エラーコードが異なる）
- 似ているが役割が異なるコンポーネント
- 1箇所でしか使わないユーティリティ

## 共通UIコンポーネント

複数フィーチャーで繰り返し使用されるUIパターンは共通化する。

### 作成済みコンポーネント

| コンポーネント | 場所 | 用途 |
|---------------|------|------|
| `ListSkeleton` | `src/components/ui/list-skeleton.tsx` | リスト表示のローディングスケルトン |
| `EmptyState` | `src/components/ui/empty-state.tsx` | 空状態の表示 |

### 使用例

```typescript
// ListSkeleton - variantで表示形式を切り替え
<ListSkeleton variant="user" count={5} />
<ListSkeleton variant="feed" count={3} />
<ListSkeleton variant="notification" count={5} />

// EmptyState - アイコン・タイトル・説明をカスタマイズ
<EmptyState
  icon={Users}
  title="まだ誰もフォローしていません"
  description="ユーザーを検索してフォローしてみましょう"
/>
```

## 責務分離の実績

2025年1月リファクタリングでの分割実績：

| コンポーネント | Before | After | 削減率 | 主な分離先 |
|---------------|--------|-------|--------|-----------|
| `timeline-list.tsx` | 520行 | 279行 | 46% | `use-timeline-grouping.ts`, `use-initial-scroll.ts` |
| `social-feed-tab.tsx` | 367行 | 111行 | 70% | `use-feed-entries.ts`, `use-achievement-realtime.ts` |
| `entry-form.tsx` | 406行 | 322行 | 21% | `ImageUploadSection.tsx` |

### 分離判断の目安

- **300行超**: 責務の見直しを検討
- **400行超**: カスタムフックへの分離を検討
- **500行超**: 必ず分離（保守性が著しく低下するため）
