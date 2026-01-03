# リファクタリング思想・設計原則

本ドキュメントは、hibioruプロジェクトのリファクタリングで適用した設計思想と原則を網羅的に記述する。

## 1. アーキテクチャ原則

### 1.1 Features-based Architecture（bulletproof-react）

- **依存関係の方向**: 共有パーツ ← フィーチャー ← アプリケーション層
- **クロスフィーチャーインポート禁止**: 機能間の直接依存を排除し、疎結合を維持
- **コロケーション**: 関連するコード（コンポーネント、フック、テスト）を同一ディレクトリに配置

### 1.2 単一責任の原則（SRP）

- 1つのコンポーネント/フック/関数は1つの責務のみを持つ
- 500行を超えるファイルは責務分割を検討
- カスタムフックによるロジック抽出で、コンポーネントはUIに専念

## 2. 状態管理の原則

### 2.1 状態の分類と適切な管理方法

| 状態種別 | 管理方法 | 理由 |
|----------|----------|------|
| サーバー状態 | TanStack Query | キャッシュ、再取得、楽観的更新を標準化 |
| UI状態（ローカル） | useState | コンポーネントスコープで十分 |
| UI状態（共有） | Zustand | Context より軽量、セレクター対応 |
| フォーム状態 | useState / フォームライブラリ | ローカルで管理すべき |
| URL状態 | nuqs（将来） | ブックマーク可能、共有可能 |

### 2.2 TanStack Query の標準パターン

#### queryKey の階層化

```typescript
// 良い例: 階層的なキー構造
queryKeys.social.feed()         // ['social', 'feed']
queryKeys.social.feed('cursor') // ['social', 'feed', 'cursor']

// 関連クエリをまとめて無効化可能
queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() })
```

#### queryKey ヘルパー関数の使用

```typescript
// 推奨: ヘルパー関数を使用
const queryKey = queryKeys.social.feed()

// 避ける: 手動でキーを構築（不整合の原因）
const queryKey = [...queryKeys.social.all, 'feed']
```

## 3. コード品質の原則

### 3.1 DRY（Don't Repeat Yourself）

- 同一の処理が2箇所以上で使われたら共通化を検討
- ただし「似ているだけ」の処理は共通化しない（役割が違えば別実装）

#### 実例: getTimeAgo 関数の統合

```typescript
// Before: 2つのコンポーネントで重複定義
// social-feed-tab.tsx と social-notifications-tab.tsx

// After: lib/date-utils.ts に統合
export function getTimeAgo(dateString: string): string {
  // 共通実装
}
```

#### 実例: アニメーション設定の統合

```typescript
// Before: 7つのコンポーネントで重複定義
const springTransition = { type: 'spring', stiffness: 300, damping: 25 }

// After: constants.ts に統合
export const ANIMATION_CONFIG = {
  springDefault: { type: 'spring', stiffness: 300, damping: 25 },
  springSnappy: { type: 'spring', stiffness: 400, damping: 25 },
} as const
```

### 3.2 定数の管理

- マジックナンバー禁止
- 設定値は constants.ts に集約
- アニメーション設定、エラーメッセージも定数化

```typescript
// constants.ts の構成例
export const ANIMATION_CONFIG = { ... }
export const PARTICLE_CONFIG = { ... }
export const ERROR_MESSAGES = { ... }
export const SOCIAL_PAGINATION = { ... }
```

### 3.3 型安全性

- any 禁止
- as const で readonly tuple を活用
- Result型パターンでエラーを型安全に扱う

```typescript
type SocialResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }
```

## 4. API レイヤーの原則

### 4.1 重複ロジックの共通化

```typescript
// Before: 通知設定チェックが2箇所で重複
export async function sendCelebrationPushNotification(...) {
  const { data: settings } = await adminClient
    .from('notification_settings')
    .select('social_notifications_enabled')
    .eq('user_id', toUserId)
    .single()
  // ...
}

// After: 共通関数に抽出
async function isSocialNotificationEnabled(userId: string): Promise<boolean> {
  // 共通実装
}

export async function sendCelebrationPushNotification(...) {
  if (!(await isSocialNotificationEnabled(toUserId))) return
  // ...
}
```

### 4.2 並列クエリの活用

```typescript
// Before: 順次実行
const followingResult = await supabase.from('follows').select(...)
const followerResult = await supabase.from('follows').select(...)

// After: 並列実行
const [followingResult, followerResult] = await Promise.all([
  supabase.from('follows').select(...),
  supabase.from('follows').select(...),
])
```

## 5. コンポーネント設計の原則

### 5.1 ロジックの分離

```typescript
// Before: コンポーネント内にロジックが混在
function FeedItem({ item }) {
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState([])
  const handleSuccess = useCallback((newState) => {
    if (newState) {
      setParticles(generateParticles())
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 600)
    }
  }, [])
  // ... 長いロジック
}

// After: カスタムフックに抽出
function FeedItem({ item }) {
  const { isCelebrated, isPending, toggle, showParticles, particles } = useFeedItem({
    achievementId: item.id,
    initialIsCelebrated: item.isCelebrated,
    initialCount: item.celebrationCount,
  })
  // ... UIのみ
}
```

### 5.2 エラーハンドリング

```typescript
// エラー状態の追加
const [error, setError] = useState<string | null>(null)

// エラー時の UI
if (error && users.length === 0) {
  return (
    <ErrorState
      message={error}
      onRetry={() => loadUsers()}
    />
  )
}
```

## 6. テストの原則

### 6.1 テスト配置

- ユニットテスト: 各フィーチャーの `__tests__/` 内
- E2Eテスト: `e2e/` ディレクトリ

### 6.2 テスト優先度

1. ビジネスロジック（計算、変換、検証）
2. カスタムフック（状態管理、副作用）
3. 統合テスト（APIレイヤー）

## 7. 命名規則

### 7.1 ファイル名

- kebab-case（例: use-timeline.ts, entry-card.tsx）
- フック: use- プレフィックス
- テスト: *.test.ts / *.spec.ts

### 7.2 関数名

- 動詞 + 名詞（例: calculateStreak, fetchEntries）
- イベントハンドラ: handle + 動詞（例: handleClick, handleSubmit）

### 7.3 変数名

- ブール値: is/has/can プレフィックス
- 配列: 複数形（entries, users）
- オブジェクト: 単数形（entry, user）

## 8. 将来の改善計画

### Phase 7-9（大規模改善）

以下は別タスクとして実施予定：

1. **Next.js エコシステム最適化**
   - React `cache()` によるSupabaseクエリのメモ化
   - Suspense境界の追加
   - revalidatePath によるキャッシュ無効化

2. **データフェッチベストプラクティス**
   - HydrationBoundary によるServer→Client データ引き継ぎ
   - 次ページ自動プリフェッチ

3. **状態管理ベストプラクティス**
   - useMutation への移行（楽観的更新の標準化）
   - useQuery / useInfiniteQuery への移行
   - social-store の導入

## 参考資料

- [bulletproof-react](https://github.com/alan2207/bulletproof-react)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- [TanStack Query](https://tanstack.com/query/latest)
