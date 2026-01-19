import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { PageLayout } from '@/components/layouts/page-layout'
import { SocialHeader } from '@/features/social/components/social-header'
import { UserProfileView } from '@/features/social/components/user-profile-view'

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} - ヒビオル`,
    description: `${username}のプロフィール`,
  }
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()

  // 認証チェック
  const currentUser = await getAuthenticatedUser(supabase)
  if (!currentUser) {
    redirect('/')
  }

  // ユーザー情報を取得
  const { data: profileUser, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single()

  if (error || !profileUser) {
    notFound()
  }

  // 自分のプロフィールの場合はソーシャルページにリダイレクト
  if (profileUser.id === currentUser.id) {
    redirect('/social')
  }

  // フォロー状態を取得
  const { data: followData } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUser.id)
    .eq('following_id', profileUser.id)
    .maybeSingle()

  const isFollowing = !!followData

  return (
    <PageLayout header={<SocialHeader />} mainClassName="overflow-y-auto">
      <div className="container mx-auto max-w-2xl py-6 px-4">
        <UserProfileView
          user={profileUser}
          currentUserId={currentUser.id}
          initialIsFollowing={isFollowing}
        />
      </div>
    </PageLayout>
  )
}
