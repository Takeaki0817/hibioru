---
paths: src/features/**/api/**, src/features/**/hooks/use-*.ts
---

# データフェッチ規約

## Supabaseクエリ

### エラーチェック必須

```typescript
const { data, error } = await supabase.from('table').select()

if (error) {
  console.error('取得失敗:', error.message)
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

## Promise.allSettled

副作用の並列実行時は必ず `await` してエラーログを出力。

```typescript
await Promise.allSettled([
  updateStreak(userId),
  sendNotification(userId),
]).then((results) => {
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`並列処理[${index}]失敗:`, result.reason)
    }
  })
})
```

## TanStack Query

### queryKey階層化

リソース種別を先頭に置き、関連クエリをまとめて無効化しやすくする。

```typescript
// 良い例: 階層的
['entries', 'timeline', userId, cursor]
['entries', 'calendar', userId, year, month]
['entries', 'dates', userId]

// 避ける例: フラット
['timeline', userId]
['calendar', userId, year, month]
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
  queryKey: ['entries', 'timeline', userId],
  queryFn: fetchTimeline,
  staleTime: 10 * 60 * 1000, // 10分
  gcTime: 30 * 60 * 1000,    // 30分
})
```
