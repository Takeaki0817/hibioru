import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimelineClient } from './TimelineClient'

export default async function TimelinePage() {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 今日の投稿を初期データとして取得
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: todayEntries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })

  return <TimelineClient userId={user.id} initialEntries={todayEntries || []} />
}
