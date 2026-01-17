import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { TimelineClient } from './TimelineClient'
import type { Entry } from '@/lib/types/database'
import { logger } from '@/lib/logger'
import { getJSTDayBounds } from '@/lib/date-utils'

export const metadata: Metadata = {
  title: 'タイムライン - ヒビオル',
  description: 'あなたの日々の記録を確認',
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: initialDate } = await searchParams
  const supabase = await createClient()
  const { start: todayStart, end: todayEnd } = getJSTDayBounds()

  // 認証チェック（E2Eテストモードではモックユーザーを使用）
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    redirect('/')
  }

  // 今日のエントリを取得
  // RLSにより、entriesクエリは認証ユーザーのデータのみ返される
  const entriesResult = await supabase
    .from('entries')
    .select('id, user_id, content, image_urls, created_at')
    .eq('is_deleted', false)
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
    .order('created_at', { ascending: false })

  // エントリ取得エラーはログのみ（空リストで続行可能）
  if (entriesResult.error) {
    logger.error('エントリ取得失敗:', entriesResult.error.message)
  }

  // 二重防御: RLSが無効化された場合に備えてuser_idでフィルタリング
  const todayEntries = ((entriesResult.data ?? []) as Entry[]).filter(
    entry => entry.user_id === user.id
  )

  return <TimelineClient userId={user.id} initialEntries={todayEntries} initialDate={initialDate} />
}
