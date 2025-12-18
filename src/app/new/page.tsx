import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntryForm } from '@/features/entry/components/entry-form'

export default async function NewEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main>
      <EntryForm mode="create" userId={user.id} />
    </main>
  )
}
