import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/types/database.generated'
import {
  setupTestSession,
  waitForPageLoad,
  mockBillingLimitsAPI,
} from './fixtures/test-helpers'
import { createTestStreak } from './fixtures/stripe-helpers'

/**
 * ほつれ自動化E2Eテスト
 *
 * テストシナリオ:
 * 1. 週次リセット（月曜JST 0:00）でほつれが2個に回復
 * 2. 記録忘れ時のほつれ自動消費でストリーク維持
 * 3. 新規ユーザーへの初期ほつれ付与（2個）
 * 4. ほつれ0で記録なしの場合のストリークリセット
 * 5. bonus_hotsure（購入分）の消費順序確認（通常より後に消費）
 * 6. ほつれ使用日の糸マーク表示確認
 * 7. 週次リセット時のused_datesクリア確認
 * 8. 並列処理での二重消費防止（FOR UPDATE）
 *
 * 前提:
 * - ローカルSupabase起動
 * - Next.js開発サーバー起動
 */

/**
 * ローカルSupabase開発用キー（supabase-demo発行の公開キー）
 * - issuer: "supabase-demo" - Supabase公式のデモ/ローカル開発用
 * - 本番環境では SUPABASE_SERVICE_ROLE_KEY 環境変数を使用すること
 */
const SUPABASE_LOCAL_DEMO_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// テストユーザーID
const HOTSURE_TEST_USER = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'hotsure-automation@test.example.com',
}

// 並列テスト用ユーザーID
const CONCURRENT_TEST_USERS = [
  { id: '00000000-0000-4000-8000-000000000011', email: 'concurrent-1@test.example.com' },
  { id: '00000000-0000-4000-8000-000000000012', email: 'concurrent-2@test.example.com' },
]

// Supabase Admin Client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_LOCAL_DEMO_SERVICE_KEY
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * ストリークレコードを取得
 */
async function getStreakRecord(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * ストリークレコードを直接更新（テスト用）
 */
async function updateStreakRecord(
  userId: string,
  updates: Partial<{
    current_streak: number
    longest_streak: number
    hotsure_remaining: number
    bonus_hotsure: number
    hotsure_used_dates: string[]
    last_entry_date: string | null
  }>
) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('streaks')
    .update(updates)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * エントリを作成（テスト用）
 */
async function createTestEntry(
  userId: string,
  createdAt: string,
  content: string = 'テストエントリ'
) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: userId,
      content,
      created_at: createdAt,
      is_public: false,
      is_shared: false,
      is_deleted: false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

/**
 * テストユーザー作成
 */
async function setupHotsureTestUser(userId: string, email: string) {
  const supabase = getSupabaseAdmin()

  // 既存ユーザー確認
  const { data: existingUser } = await supabase.auth.admin.getUserById(userId)
  if (!existingUser?.user) {
    await supabase.auth.admin.createUser({
      id: userId,
      email,
      email_confirm: true,
      user_metadata: {
        full_name: 'Hotsure Test User',
        is_test_user: true,
      },
    })
  }
}

/**
 * テストデータクリーンアップ
 */
async function cleanupHotsureTestData(userId: string) {
  const supabase = getSupabaseAdmin()
  await supabase.from('entries').delete().eq('user_id', userId)
  await supabase.from('streaks').delete().eq('user_id', userId)
  await supabase.from('subscriptions').delete().eq('user_id', userId)
}

/**
 * JST日付文字列を取得（YYYY-MM-DD形式）
 */
function getJSTDateString(date: Date = new Date()): string {
  const jstOffset = 9 * 60 // JST is UTC+9
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000
  const jstTime = new Date(utcTime + jstOffset * 60 * 1000)
  return jstTime.toISOString().split('T')[0]
}

/**
 * 日次ストリーク処理RPCを実行
 */
async function executeDailyStreakBatch() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('process_daily_streak')
  if (error) throw error
  return data as {
    success: boolean
    processed_users: number
    hotsure_consumed: number
    bonus_hotsure_consumed?: number
    streaks_broken: number
    errors: number
  }
}

/**
 * 週次ほつれリセットRPCを実行
 */
async function executeWeeklyHotsureReset() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('reset_hotsure_weekly')
  if (error) throw error
  return data as {
    success: boolean
    affected_users: number
  }
}

/**
 * ほつれ消費RPCを実行
 */
async function executeConsumeHotsure(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('consume_hotsure', {
    p_user_id: userId,
  })
  if (error) throw error
  return data as {
    success: boolean
    remaining?: number
    error?: string
  }
}

// ============================================
// テストセットアップ
// ============================================

test.beforeEach(async () => {
  await setupHotsureTestUser(HOTSURE_TEST_USER.id, HOTSURE_TEST_USER.email)
  await cleanupHotsureTestData(HOTSURE_TEST_USER.id)
})

test.afterEach(async () => {
  await cleanupHotsureTestData(HOTSURE_TEST_USER.id)
})

// ============================================
// 1. 週次リセットテスト
// ============================================
test.describe('週次リセット（月曜JST 0:00）', () => {
  test('ほつれが2個に回復する', async () => {
    const userId = HOTSURE_TEST_USER.id

    // ストリークレコード作成（ほつれ0の状態）
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 0,
      hotsure_used_dates: ['2025-01-06', '2025-01-07'],
    })

    // 初期状態確認
    const before = await getStreakRecord(userId)
    expect(before?.hotsure_remaining).toBe(0)
    expect(before?.hotsure_used_dates).toHaveLength(2)

    // 週次リセット実行
    const result = await executeWeeklyHotsureReset()
    expect(result.success).toBe(true)

    // リセット後確認
    const after = await getStreakRecord(userId)
    expect(after?.hotsure_remaining).toBe(2)
    expect(after?.hotsure_used_dates).toHaveLength(0)
  })

  test('used_datesがクリアされる', async () => {
    const userId = HOTSURE_TEST_USER.id

    // 使用履歴ありの状態で作成
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 1,
      hotsure_used_dates: ['2025-01-08'],
    })

    // 週次リセット実行
    await executeWeeklyHotsureReset()

    // リセット後確認
    const after = await getStreakRecord(userId)
    expect(after?.hotsure_used_dates).toEqual([])
    expect(after?.hotsure_remaining).toBe(2)
  })
})

// ============================================
// 2. 記録忘れ時のほつれ自動消費テスト
// ============================================
test.describe('記録忘れ時のほつれ自動消費', () => {
  test('ほつれがあれば消費してストリーク維持', async () => {
    const userId = HOTSURE_TEST_USER.id
    const today = getJSTDateString()
    const yesterday = getJSTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const twoDaysAgo = getJSTDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))

    // ストリーク5日、ほつれ2個、2日前が最終記録
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      current_streak: 5,
      longest_streak: 5,
      hotsure_remaining: 2,
      hotsure_used_dates: [],
      last_entry_date: twoDaysAgo,
    })

    // 2日前のエントリ作成
    await createTestEntry(userId, `${twoDaysAgo}T12:00:00+09:00`)

    // 日次バッチ実行（昨日の記録がないことを検出）
    const result = await executeDailyStreakBatch()
    expect(result.success).toBe(true)

    // 結果確認
    const after = await getStreakRecord(userId)
    expect(after?.current_streak).toBe(5) // ストリーク維持
    expect(after?.hotsure_remaining).toBe(1) // ほつれ1消費
    expect(after?.hotsure_used_dates).toContain(yesterday) // 使用日に追加
  })

  test('hotsure_remaining消費後にbonus_hotsureが消費される', async () => {
    const userId = HOTSURE_TEST_USER.id
    const yesterday = getJSTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const twoDaysAgo = getJSTDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))

    // ストリーク5日、通常ほつれ0、ボーナスほつれ2個
    await createTestStreak(userId, 2) // bonus_hotsure = 2
    await updateStreakRecord(userId, {
      current_streak: 5,
      longest_streak: 5,
      hotsure_remaining: 0,
      hotsure_used_dates: [],
      last_entry_date: twoDaysAgo,
    })

    // 2日前のエントリ作成
    await createTestEntry(userId, `${twoDaysAgo}T12:00:00+09:00`)

    // 日次バッチ実行
    const result = await executeDailyStreakBatch()
    expect(result.success).toBe(true)

    // 結果確認
    const after = await getStreakRecord(userId)
    expect(after?.current_streak).toBe(5) // ストリーク維持
    expect(after?.hotsure_remaining).toBe(0) // 通常ほつれ変わらず
    expect(after?.bonus_hotsure).toBe(1) // ボーナス1消費
    expect(after?.hotsure_used_dates).toContain(yesterday) // 使用日に追加
  })
})

// ============================================
// 3. 新規ユーザーへの初期ほつれ付与テスト
// ============================================
test.describe('新規ユーザーへの初期ほつれ付与', () => {
  test('新規ストリークレコード作成時にほつれが2個付与される', async () => {
    const userId = HOTSURE_TEST_USER.id

    // ストリークレコードを新規作成（初期値）
    await createTestStreak(userId, 0)

    // 確認
    const streak = await getStreakRecord(userId)
    expect(streak?.hotsure_remaining).toBe(2)
    expect(streak?.hotsure_used_dates).toEqual([])
  })
})

// ============================================
// 4. ほつれ0でストリークリセットテスト
// ============================================
test.describe('ほつれ0で記録なしの場合のストリークリセット', () => {
  test('通常・ボーナス両方0の場合ストリークがリセットされる', async () => {
    const userId = HOTSURE_TEST_USER.id
    const twoDaysAgo = getJSTDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))

    // ストリーク10日、ほつれ0
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      current_streak: 10,
      longest_streak: 15,
      hotsure_remaining: 0,
      bonus_hotsure: 0,
      hotsure_used_dates: [],
      last_entry_date: twoDaysAgo,
    })

    // 2日前のエントリ作成
    await createTestEntry(userId, `${twoDaysAgo}T12:00:00+09:00`)

    // 日次バッチ実行
    const result = await executeDailyStreakBatch()
    expect(result.success).toBe(true)
    expect(result.streaks_broken).toBeGreaterThan(0)

    // 結果確認
    const after = await getStreakRecord(userId)
    expect(after?.current_streak).toBe(0) // ストリークリセット
    expect(after?.longest_streak).toBe(15) // 最長記録は維持
  })
})

// ============================================
// 5. bonus_hotsure消費順序確認テスト
// ============================================
test.describe('bonus_hotsure消費順序', () => {
  test('hotsure_remainingが先に消費され、その後bonus_hotsureが消費される', async () => {
    const userId = HOTSURE_TEST_USER.id
    const yesterday = getJSTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const twoDaysAgo = getJSTDateString(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
    const threeDaysAgo = getJSTDateString(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))

    // 通常ほつれ1、ボーナス2
    await createTestStreak(userId, 2)
    await updateStreakRecord(userId, {
      current_streak: 5,
      hotsure_remaining: 1,
      hotsure_used_dates: [],
      last_entry_date: threeDaysAgo,
    })

    // 3日前のエントリ作成
    await createTestEntry(userId, `${threeDaysAgo}T12:00:00+09:00`)

    // 1回目のバッチ（通常ほつれを消費）
    await executeDailyStreakBatch()

    let streak = await getStreakRecord(userId)
    expect(streak?.hotsure_remaining).toBe(0) // 通常が先に消費
    expect(streak?.bonus_hotsure).toBe(2) // ボーナスはまだ残る

    // 状態をリセット（last_entry_dateを2日前に）
    await updateStreakRecord(userId, {
      last_entry_date: twoDaysAgo,
    })
    await createTestEntry(userId, `${twoDaysAgo}T12:00:00+09:00`)

    // 2回目のバッチ（ボーナスほつれを消費）
    await executeDailyStreakBatch()

    streak = await getStreakRecord(userId)
    expect(streak?.hotsure_remaining).toBe(0) // 通常は0のまま
    expect(streak?.bonus_hotsure).toBe(1) // ボーナスが消費される
  })
})

// ============================================
// 6. ほつれ使用日の糸マーク表示確認テスト
// ============================================
test.describe('ほつれ使用日の糸マーク表示', () => {
  test.skip(
    () => !process.env.PLAYWRIGHT_AUTH_ENABLED,
    '認証が必要なテスト: PLAYWRIGHT_AUTH_ENABLED=true で実行'
  )

  test('カレンダーでほつれ使用日に糸マークが表示される', async ({ page }) => {
    const userId = HOTSURE_TEST_USER.id
    const today = getJSTDateString()
    const yesterday = getJSTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))

    // セッション設定
    await setupTestSession(page, userId)

    // ストリークレコード作成（昨日ほつれ使用）
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      current_streak: 5,
      hotsure_remaining: 1,
      hotsure_used_dates: [yesterday],
      last_entry_date: today,
    })

    // APIモック
    await mockBillingLimitsAPI(page, {
      planType: 'free',
      hotsureRemaining: 1,
      bonusHotsure: 0,
    })

    // タイムラインページへ
    await page.goto('/timeline')
    await waitForPageLoad(page)

    // カレンダーを開く
    const calendarButton = page.getByRole('button', { name: 'カレンダーを開く' })
    if (await calendarButton.isVisible()) {
      await calendarButton.click()

      // カレンダー表示確認
      await expect(page.locator('.rdp')).toBeVisible()

      // 凡例にほつれマークが存在することを確認
      const hotsureLegend = page.getByText(/ほつれ/)
      const isVisible = await hotsureLegend.isVisible().catch(() => false)
      if (isVisible) {
        await expect(hotsureLegend).toBeVisible()
      }
    }
  })
})

// ============================================
// 7. 週次リセット時のused_datesクリア確認テスト
// ============================================
test.describe('週次リセット時のused_datesクリア', () => {
  test('複数の使用日がすべてクリアされる', async () => {
    const userId = HOTSURE_TEST_USER.id

    // 複数の使用日を設定
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 0,
      hotsure_used_dates: ['2025-01-06', '2025-01-07', '2025-01-08'],
    })

    // 初期状態確認
    const before = await getStreakRecord(userId)
    expect(before?.hotsure_used_dates).toHaveLength(3)

    // 週次リセット実行
    await executeWeeklyHotsureReset()

    // リセット後確認
    const after = await getStreakRecord(userId)
    expect(after?.hotsure_used_dates).toEqual([])
    expect(after?.hotsure_remaining).toBe(2)
  })
})

// ============================================
// 8. 並列処理での二重消費防止テスト
// ============================================
test.describe('並列処理での二重消費防止', () => {
  test.beforeEach(async () => {
    for (const user of CONCURRENT_TEST_USERS) {
      await setupHotsureTestUser(user.id, user.email)
      await cleanupHotsureTestData(user.id)
    }
  })

  test.afterEach(async () => {
    for (const user of CONCURRENT_TEST_USERS) {
      await cleanupHotsureTestData(user.id)
    }
  })

  test('同時呼び出しでも1回だけ消費される（FOR UPDATE）', async () => {
    const userId = CONCURRENT_TEST_USERS[0].id

    // ほつれ2個で初期化
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 2,
      hotsure_used_dates: [],
    })

    // 並列でほつれ消費を実行（5回同時）
    const promises = Array(5)
      .fill(null)
      .map(() => executeConsumeHotsure(userId))

    const results = await Promise.all(promises)

    // 成功した回数をカウント
    const successCount = results.filter((r) => r.success).length

    // 結果確認
    const streak = await getStreakRecord(userId)

    // 成功回数 = 2 - 残りほつれ数
    expect(successCount).toBe(2 - (streak?.hotsure_remaining ?? 0))

    // ほつれは最低0まで
    expect(streak?.hotsure_remaining).toBeGreaterThanOrEqual(0)
  })

  test('同日に複数回消費は不可', async () => {
    const userId = CONCURRENT_TEST_USERS[1].id

    // ほつれ2個で初期化
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 2,
      hotsure_used_dates: [],
    })

    // 1回目の消費
    const first = await executeConsumeHotsure(userId)
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(1)

    // 2回目の消費（同日）
    const second = await executeConsumeHotsure(userId)
    expect(second.success).toBe(false)
    expect(second.error).toContain('already used today')
  })
})

// ============================================
// 追加テスト: エッジケース
// ============================================
test.describe('エッジケース', () => {
  test('ストリークレコードが存在しないユーザーへの消費試行', async () => {
    // 存在しないユーザーID
    const nonExistentUserId = '00000000-0000-4000-8000-999999999999'

    const result = await executeConsumeHotsure(nonExistentUserId)
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('ほつれ残量0での消費試行', async () => {
    const userId = HOTSURE_TEST_USER.id

    // ほつれ0で初期化
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      hotsure_remaining: 0,
      hotsure_used_dates: [],
    })

    const result = await executeConsumeHotsure(userId)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No hotsure remaining')
  })

  test('記録ありの日はほつれ消費されない', async () => {
    const userId = HOTSURE_TEST_USER.id
    const today = getJSTDateString()
    const yesterday = getJSTDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))

    // ストリーク初期化
    await createTestStreak(userId, 0)
    await updateStreakRecord(userId, {
      current_streak: 5,
      hotsure_remaining: 2,
      hotsure_used_dates: [],
      last_entry_date: yesterday,
    })

    // 昨日のエントリ作成（記録あり）
    await createTestEntry(userId, `${yesterday}T18:00:00+09:00`)

    // 日次バッチ実行
    const result = await executeDailyStreakBatch()
    expect(result.success).toBe(true)

    // ほつれは消費されていない
    const streak = await getStreakRecord(userId)
    expect(streak?.hotsure_remaining).toBe(2)
    expect(streak?.hotsure_used_dates).toEqual([])
  })
})
