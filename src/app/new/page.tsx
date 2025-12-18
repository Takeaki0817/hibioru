import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewEntryClient } from './NewEntryClient'

export default async function NewEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <NewEntryClient userId={user.id} />
}
