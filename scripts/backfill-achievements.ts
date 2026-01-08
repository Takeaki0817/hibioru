// 既存ユーザーのアチーブメントをバックフィルするスクリプト
// 使用方法: npx tsx scripts/backfill-achievements.ts [--dry-run]
import { createClient } from '@supabase/supabase-js'

// 環境変数またはデフォルト（ローカル開発用）
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseKey)

// 達成閾値（constants.tsと同じ）
const ACHIEVEMENT_THRESHOLDS = {
  total_posts: [
    10, 30, 50, 100, 150, 200, 250, 300, 400, 500,
    ...Array.from({ length: 95 }, (_, i) => 600 + i * 100),
  ],
  streak_days: [
    3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365,
    ...Array.from({ length: 55 }, (_, i) => 425 + i * 60),
  ],
} as const

interface UserStats {
  userId: string
  totalPosts: number
  currentStreak: number
  longestStreak: number
}

interface AchievementToCreate {
  user_id: string
  type: 'total_posts' | 'streak_days'
  threshold: number
  value: number
}

const isDryRun = process.argv.includes('--dry-run')

async function getAllUserStats(): Promise<UserStats[]> {
  console.log('ユーザー統計を取得中...')

  // 全ユーザーの投稿数を取得
  const { data: entryCounts, error: entryError } = await supabase
    .from('entries')
    .select('user_id')
    .eq('is_deleted', false)

  if (entryError) {
    throw new Error(`投稿数取得エラー: ${entryError.message}`)
  }

  // ユーザーごとに集計
  const postCountMap = new Map<string, number>()
  entryCounts?.forEach((entry) => {
    const count = postCountMap.get(entry.user_id) || 0
    postCountMap.set(entry.user_id, count + 1)
  })

  // 全ユーザーのストリーク情報を取得
  const { data: streaks, error: streakError } = await supabase
    .from('streaks')
    .select('user_id, current_streak, longest_streak')

  if (streakError) {
    throw new Error(`ストリーク取得エラー: ${streakError.message}`)
  }

  // ストリーク情報をマップに
  const streakMap = new Map<string, { current: number; longest: number }>()
  streaks?.forEach((s) => {
    streakMap.set(s.user_id, {
      current: s.current_streak,
      longest: s.longest_streak,
    })
  })

  // 全ユーザーIDを統合
  const allUserIds = new Set<string>([
    ...postCountMap.keys(),
    ...streakMap.keys(),
  ])

  const stats: UserStats[] = []
  allUserIds.forEach((userId) => {
    const streak = streakMap.get(userId) || { current: 0, longest: 0 }
    stats.push({
      userId,
      totalPosts: postCountMap.get(userId) || 0,
      currentStreak: streak.current,
      longestStreak: streak.longest,
    })
  })

  return stats
}

async function getExistingAchievements(): Promise<Set<string>> {
  console.log('既存アチーブメントを取得中...')

  const { data, error } = await supabase
    .from('achievements')
    .select('user_id, type, threshold')

  if (error) {
    throw new Error(`アチーブメント取得エラー: ${error.message}`)
  }

  // "userId:type:threshold" の形式でセットに保存
  const existing = new Set<string>()
  data?.forEach((a) => {
    existing.add(`${a.user_id}:${a.type}:${a.threshold}`)
  })

  return existing
}

function calculateAchievementsToCreate(
  stats: UserStats[],
  existing: Set<string>
): AchievementToCreate[] {
  const toCreate: AchievementToCreate[] = []

  stats.forEach((user) => {
    // 総投稿数の達成
    ACHIEVEMENT_THRESHOLDS.total_posts.forEach((threshold) => {
      if (user.totalPosts >= threshold) {
        const key = `${user.userId}:total_posts:${threshold}`
        if (!existing.has(key)) {
          toCreate.push({
            user_id: user.userId,
            type: 'total_posts',
            threshold,
            value: user.totalPosts,
          })
        }
      }
    })

    // 継続日数の達成（longest_streakを使用）
    // longest_streakは過去最高記録なので、これを使う
    const maxStreak = Math.max(user.currentStreak, user.longestStreak)
    ACHIEVEMENT_THRESHOLDS.streak_days.forEach((threshold) => {
      if (maxStreak >= threshold) {
        const key = `${user.userId}:streak_days:${threshold}`
        if (!existing.has(key)) {
          toCreate.push({
            user_id: user.userId,
            type: 'streak_days',
            threshold,
            value: maxStreak,
          })
        }
      }
    })
  })

  return toCreate
}

async function createAchievements(
  achievements: AchievementToCreate[]
): Promise<void> {
  if (achievements.length === 0) {
    console.log('作成すべきアチーブメントはありません')
    return
  }

  if (isDryRun) {
    console.log(`[DRY RUN] ${achievements.length}件のアチーブメントを作成予定:`)
    achievements.forEach((a) => {
      console.log(`  - ${a.user_id}: ${a.type} >= ${a.threshold} (実績: ${a.value})`)
    })
    return
  }

  console.log(`${achievements.length}件のアチーブメントを作成中...`)

  // バッチで挿入（100件ずつ）
  const batchSize = 100
  let created = 0

  for (let i = 0; i < achievements.length; i += batchSize) {
    const batch = achievements.slice(i, i + batchSize).map((a) => ({
      user_id: a.user_id,
      type: a.type,
      threshold: a.threshold,
      value: a.value,
      entry_id: null,
      is_shared: false,
    }))

    const { error } = await supabase.from('achievements').insert(batch)

    if (error) {
      console.error(`バッチ挿入エラー (${i}〜${i + batch.length}):`, error.message)
    } else {
      created += batch.length
      console.log(`  ${created}/${achievements.length} 件完了`)
    }
  }

  console.log(`完了: ${created}件のアチーブメントを作成しました`)
}

async function main() {
  console.log('=== アチーブメント バックフィル ===')
  console.log(`環境: ${supabaseUrl}`)
  if (isDryRun) {
    console.log('モード: DRY RUN（実際には作成しません）')
  }
  console.log('')

  try {
    // 1. ユーザー統計を取得
    const stats = await getAllUserStats()
    console.log(`${stats.length}人のユーザーを検出`)

    // 統計サマリー
    const hasEntries = stats.filter((s) => s.totalPosts > 0).length
    const hasStreak = stats.filter((s) => s.currentStreak > 0 || s.longestStreak > 0).length
    console.log(`  - 投稿あり: ${hasEntries}人`)
    console.log(`  - ストリークあり: ${hasStreak}人`)
    console.log('')

    // 2. 既存アチーブメントを取得
    const existing = await getExistingAchievements()
    console.log(`${existing.size}件の既存アチーブメント`)
    console.log('')

    // 3. 作成すべきアチーブメントを計算
    const toCreate = calculateAchievementsToCreate(stats, existing)
    console.log(`${toCreate.length}件のアチーブメントをバックフィル対象として検出`)

    // タイプ別集計
    const totalPostsCount = toCreate.filter((a) => a.type === 'total_posts').length
    const streakDaysCount = toCreate.filter((a) => a.type === 'streak_days').length
    console.log(`  - total_posts: ${totalPostsCount}件`)
    console.log(`  - streak_days: ${streakDaysCount}件`)
    console.log('')

    // 4. アチーブメントを作成
    await createAchievements(toCreate)

    console.log('')
    console.log('バックフィル完了')
  } catch (error) {
    console.error('エラー:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
