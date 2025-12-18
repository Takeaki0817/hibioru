import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntry } from '@/features/entry/api/service'
import { isEditable } from '@/features/entry/utils'
import { EntryForm } from '@/features/entry/components/entry-form'

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
    return (
      <main className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">編集できません</h1>
          <p className="text-gray-600">編集可能期間（24時間）を過ぎています</p>
        </div>
      </main>
    )
  }

  return (
    <main>
      <EntryForm mode="edit" initialEntry={entry} userId={user.id} />
    </main>
  )
}
