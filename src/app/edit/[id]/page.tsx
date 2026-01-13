import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { getEntry } from '@/features/entry/api/service'
import { isEditable } from '@/features/entry/utils'
import { EditEntryClient } from './EditEntryClient'
import { NotEditableClient } from './NotEditableClient'

export const metadata: Metadata = {
  title: '記録を編集 | ヒビオル',
  description: 'ヒビオルの記録を編集します',
  robots: { index: false }, // 編集ページはnoindex
}

export default async function EditEntryPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 認証確認とエントリ取得を並列実行（パフォーマンス最適化）
  // E2Eテストモードではモックユーザーを使用
  const [user, entryResult] = await Promise.all([
    getAuthenticatedUser(supabase),
    getEntry(id),
  ])

  if (!user) {
    redirect('/')
  }

  if (!entryResult.ok) {
    notFound()
  }

  const entry = entryResult.value

  // 所有者チェック
  if (entry.user_id !== user.id) {
    notFound()
  }

  // 24時間チェック
  if (!isEditable(entry)) {
    return <NotEditableClient entryDate={entry.created_at} />
  }

  return <EditEntryClient entry={entry} userId={user.id} />
}
