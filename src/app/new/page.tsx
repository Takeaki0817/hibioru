import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewEntryClient } from './NewEntryClient'

export const metadata: Metadata = {
  title: '新規記録 - ヒビオル',
  description: '今の気持ちを記録する',
}

export default async function NewEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return <NewEntryClient userId={user.id} />
}
