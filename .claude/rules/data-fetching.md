---
paths: src/features/**/api/**, src/features/**/hooks/use-*.ts
---

# データフェッチ規約

## Supabaseクエリ

### エラーチェック必須

```typescript
import { logger } from '@/lib/logger'

const { data, error } = await supabase.from('table').select()

if (error) {
  logger.error('取得失敗:', error.message)
}
```

### select最適化

`select('*')` を避け、必要カラムのみ取得してネットワーク帯域を削減。

```typescript
// 良い例
.select('id, user_id, content, created_at')

// 避ける例
.select('*')
```

### upsert + select でクエリ削減

更新後の値が必要な場合、別途selectせずチェーンで取得。

```typescript
const { data, error } = await supabase
  .from('table')
  .upsert(updateData)
  .select('col1, col2')
  .single()
```

---

## Promise.allSettled

副作用の並列実行時は必ず `await` してエラーログを出力。

```typescript
await Promise.allSettled([
  updateStreak(userId),
  sendNotification(userId),
]).then((results) => {
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(`並列処理[${index}]失敗:`, result.reason)
    }
  })
})
```

---

## TanStack Query

### queryKeyファクトリー

**必ず `src/lib/constants/query-keys.ts` のファクトリーを使用する。**

```typescript
import { queryKeys } from '@/lib/constants/query-keys'

// タイムライン
useQuery({
  queryKey: queryKeys.entries.timeline(userId, cursor),
  queryFn: () => fetchTimeline(userId, cursor),
})

// カレンダー
useQuery({
  queryKey: queryKeys.entries.calendar(userId, year, month),
  queryFn: () => fetchCalendar(userId, year, month),
})

// ソーシャルフィード
useInfiniteQuery({
  queryKey: queryKeys.social.feed(),
  queryFn: ({ pageParam }) => fetchSocialFeed(pageParam),
})
```

### 利用可能なqueryKeys

```typescript
// entries関連
queryKeys.entries.all                           // ['entries']
queryKeys.entries.timeline(userId, cursor)      // ['entries', 'timeline', userId, cursor]
queryKeys.entries.calendar(userId, year, month) // ['entries', 'calendar', userId, year, month]
queryKeys.entries.dates(userId)                 // ['entries', 'dates', userId]

// notification関連
queryKeys.notification.all                      // ['notification']
queryKeys.notification.settings(userId)         // ['notification', 'settings', userId]

// social関連
queryKeys.social.all                            // ['social']
queryKeys.social.feed(cursor?)                  // ['social', 'feed', cursor?]
queryKeys.social.notifications(cursor?)         // ['social', 'notifications', cursor?]
queryKeys.social.unreadCount()                  // ['social', 'unreadCount']
queryKeys.social.followStatus(userId)           // ['social', 'followStatus', userId]
queryKeys.social.followCounts(userId)           // ['social', 'followCounts', userId]
queryKeys.social.userSearch(query)              // ['social', 'userSearch', query]
queryKeys.social.profile(username)              // ['social', 'profile', username]
queryKeys.social.followingIds()                 // ['social', 'followingIds']
```

### キャッシュ無効化

階層的なキー構造により、関連クエリをまとめて無効化可能。

```typescript
// entries関連すべてを無効化
queryClient.invalidateQueries({ queryKey: queryKeys.entries.all })

// 特定ユーザーのタイムラインのみ無効化
queryClient.invalidateQueries({ queryKey: queryKeys.entries.timeline(userId) })

// social関連すべてを無効化
queryClient.invalidateQueries({ queryKey: queryKeys.social.all })
```

### staleTime/gcTime設定

データの更新頻度に応じて設定。

| データタイプ | staleTime | 例 |
|-------------|-----------|-----|
| リアルタイム性重要 | 1分 | ストリーク |
| 通常データ | 5分 | カレンダー |
| 更新頻度低い | 10分 | タイムライン |

```typescript
useQuery({
  queryKey: queryKeys.entries.timeline(userId),
  queryFn: fetchTimeline,
  staleTime: 10 * 60 * 1000, // 10分
  gcTime: 30 * 60 * 1000,    // 30分
})
```

---

## 関連ファイル

| ファイル | 用途 |
|----------|------|
| `src/lib/constants/query-keys.ts` | queryKeyファクトリー定義 |
| `src/components/providers/QueryProvider.tsx` | QueryClient設定 |
