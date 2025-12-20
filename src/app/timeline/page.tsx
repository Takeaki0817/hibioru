import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimelineClient } from './TimelineClient'
import type { Entry } from '@/lib/types/database'

// 今日の日付範囲を取得
function getTodayRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { today, tomorrow }
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: initialDate } = await searchParams
  const supabase = await createClient()
  const { today, tomorrow } = getTodayRange()

  // 認証チェックと今日のエントリ取得を並列実行（パフォーマンス最適化）
  // RLSにより、entriesクエリは認証ユーザーのデータのみ返される
  const userPromise = supabase.auth.getUser()
  const entriesPromise = supabase
    .from('entries')
    .select('*')
    .eq('is_deleted', false)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })

  const [userResult, entriesResult] = await Promise.all([userPromise, entriesPromise])

  const user = userResult.data.user
  if (!user) {
    redirect('/login')
  }

  // 二重防御: RLSが無効化された場合に備えてuser_idでフィルタリング
  const todayEntries = ((entriesResult.data ?? []) as Entry[]).filter(
    entry => entry.user_id === user.id
  )

  return <TimelineClient userId={user.id} initialEntries={todayEntries} initialDate={initialDate} />
}
