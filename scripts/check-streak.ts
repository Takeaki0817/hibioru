// ストリーク/ほつれ状態確認スクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .limit(5)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('=== ストリーク/ほつれ状態 ===')
  data?.forEach(row => {
    console.log(`user_id: ${row.user_id}`)
    console.log(`  current_streak: ${row.current_streak}`)
    console.log(`  longest_streak: ${row.longest_streak}`)
    console.log(`  last_entry_date: ${row.last_entry_date}`)
    console.log(`  hotsure_remaining: ${row.hotsure_remaining}`)
    console.log(`  hotsure_used_dates: ${JSON.stringify(row.hotsure_used_dates)}`)
    console.log('')
  })
}

main()
