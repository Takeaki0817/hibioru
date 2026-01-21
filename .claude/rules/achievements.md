---
globs: src/features/social/constants.ts, scripts/backfill-*.ts
---

# アチーブメント運用規約

## 閾値変更時の注意

`ACHIEVEMENT_THRESHOLDS` を変更（追加・削除）した場合、既存ユーザーへのバックフィルが必要。

### バックフィル対象

| タイプ | 対象 |
|--------|------|
| `total_posts` | 現在の総投稿数から達成済み閾値を計算 |
| `streak_days` | `longest_streak`（過去最高）から達成済み閾値を計算 |
| `daily_posts` | 対象外（過去の日ごとデータ追跡が複雑） |

### 実行手順

```bash
# 1. dry-run で確認
export $(grep -v '^#' .env.production | xargs) && \
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
npx tsx scripts/backfill-achievements.ts --dry-run

# 2. 本番実行
export $(grep -v '^#' .env.production | xargs) && \
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
npx tsx scripts/backfill-achievements.ts
```

### 判定ロジック

エントリ作成時に `checkAndCreateAchievements()` がリアルタイム判定:

```typescript
// achievements.ts
if (currentValue === threshold) {
  // 閾値と完全一致した時のみ達成レコード作成
}
```

- 閾値を**超えた**ユーザーには自動作成されない
- バックフィルで過去分を補完する必要がある
