// ほつれ機能テストスクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const supabase = createClient(supabaseUrl, supabaseKey)

async function showStreakStatus() {
  const { data } = await supabase.from('streaks').select('*').limit(1).single()
  if (data) {
    console.log('\n📊 現在の状態:')
    console.log(`  current_streak: ${data.current_streak}`)
    console.log(`  longest_streak: ${data.longest_streak}`)
    console.log(`  last_entry_date: ${data.last_entry_date}`)
    console.log(`  hotsure_remaining: ${data.hotsure_remaining}`)
    console.log(`  hotsure_used_dates: ${JSON.stringify(data.hotsure_used_dates)}`)
  }
  return data
}

async function main() {
  const command = process.argv[2]

  console.log('=== ほつれ機能テスト ===')
  await showStreakStatus()

  if (command === 'setup') {
    // テスト用にストリークを設定（記録を作った状態をシミュレート）
    console.log('\n🔧 テスト用セットアップ...')

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0]

    const { error } = await supabase
      .from('streaks')
      .update({
        current_streak: 5,  // 5日継続中をシミュレート
        longest_streak: 5,
        last_entry_date: threeDaysAgoStr,  // 3日前に最後の記録
        hotsure_remaining: 2,
        hotsure_used_dates: []
      })
      .eq('user_id', (await supabase.from('streaks').select('user_id').limit(1).single()).data?.user_id)

    if (error) {
      console.error('Error:', error.message)
      return
    }

    console.log('✅ セットアップ完了（5日継続中、最終記録は3日前）')
    await showStreakStatus()
  }

  if (command === 'batch') {
    // 日次バッチを実行
    console.log('\n⚡ 日次バッチ処理を実行...')

    const { data, error } = await supabase.rpc('process_daily_streak')

    if (error) {
      console.error('Error:', error.message)
      return
    }

    console.log('\n📋 バッチ結果:', JSON.stringify(data, null, 2))
    await showStreakStatus()
  }

  if (command === 'reset') {
    // ほつれをリセット
    console.log('\n🔄 ほつれをリセット...')

    const { error } = await supabase
      .from('streaks')
      .update({
        current_streak: 0,
        longest_streak: 0,
        last_entry_date: null,
        hotsure_remaining: 2,
        hotsure_used_dates: []
      })
      .eq('user_id', (await supabase.from('streaks').select('user_id').limit(1).single()).data?.user_id)

    if (error) {
      console.error('Error:', error.message)
      return
    }

    console.log('✅ リセット完了')
    await showStreakStatus()
  }

  if (!command) {
    console.log('\n使い方:')
    console.log('  npx tsx scripts/test-hotsure.ts setup  - テスト用セットアップ')
    console.log('  npx tsx scripts/test-hotsure.ts batch  - 日次バッチ実行')
    console.log('  npx tsx scripts/test-hotsure.ts reset  - 状態リセット')
  }
}

main()
