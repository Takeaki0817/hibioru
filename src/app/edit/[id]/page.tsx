import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntry } from '@/features/entry/api/service'
import { isEditable } from '@/features/entry/utils'
import { EditEntryClient } from './EditEntryClient'
import { NotEditableClient } from './NotEditableClient'

export default async function EditEntryPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const result = await getEntry(id)
  if (!result.ok) {
    notFound()
  }

  const entry = result.value

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
