import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { PageLayout } from '@/components/layouts/page-layout'
import { SocialHeader } from '@/features/social/components/social-header'
import { FollowListPage } from '@/features/social/components/follow-list-page'

export const metadata: Metadata = {
  title: 'フォロー中 - ヒビオル',
  description: 'フォロー中のユーザー一覧',
}

export default async function FollowingPage() {
  const supabase = await createClient()

  // 認証チェック
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    redirect('/')
  }

  return (
    <PageLayout header={<SocialHeader />} mainClassName="overflow-y-auto">
      <div className="container mx-auto max-w-2xl py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">フォロー中</h1>
        <FollowListPage userId={user.id} type="following" />
      </div>
    </PageLayout>
  )
}
