import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layouts/page-layout'
import { MypageTabs } from '@/features/mypage/components/mypage-tabs'
import { ProfileTabContent } from '@/features/mypage/components/profile-tab-content'
import { SocialFeedTab } from '@/features/social/components/social-feed-tab'
import { SocialNotificationsTab } from '@/features/social/components/social-notifications-tab'
import { getStreakInfo, getWeeklyRecords } from '@/features/streak/api/service'
import { getNotificationSettings } from '@/features/notification/api/service'
import { getUnreadCount } from '@/features/social/api/notifications'
import { DEFAULT_REMINDERS } from '@/features/notification/types'

export const metadata: Metadata = {
  title: 'マイページ - ヒビオル',
  description: 'ストリーク、ほつれ、通知設定の管理',
}

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーはログインページにリダイレクト
  if (!user) {
    redirect('/login')
  }

  // ストリーク・ほつれ・通知設定・未読数・プロフィールを並列取得（パフォーマンス最適化）
  const [streakResult, weeklyResult, notificationResult, unreadResult, profileResult] = await Promise.all([
    getStreakInfo(user.id),
    getWeeklyRecords(user.id),
    getNotificationSettings(user.id),
    getUnreadCount(),
    supabase.from('users').select('username, display_name').eq('id', user.id).single(),
  ])

  const stats = {
    currentStreak: streakResult.ok ? streakResult.value.currentStreak : 0,
    longestStreak: streakResult.ok ? streakResult.value.longestStreak : 0,
    hotsureRemaining: streakResult.ok ? streakResult.value.hotsureRemaining : 2,
    hotsureMax: 2,
  }
  const weeklyRecords = weeklyResult.ok ? weeklyResult.value : undefined
  const notificationSettings = notificationResult.ok
    ? notificationResult.value
    : {
        user_id: user.id,
        enabled: false,
        reminders: DEFAULT_REMINDERS,
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
        follow_up_max_count: 2,
      }
  const unreadCount = unreadResult.ok ? unreadResult.value : 0
  const profileData = profileResult.data
  const username = profileData?.username ?? null
  const displayName = profileData?.display_name ?? user.user_metadata?.full_name ?? null

  return (
    <PageLayout>
      <div className="container mx-auto p-4 max-w-2xl pb-6">
        <h1 className="sr-only">ヒビオル</h1>
        <h2 className="text-2xl font-bold mb-6">マイページ</h2>

        <MypageTabs
          profileContent={
            <ProfileTabContent
              user={user}
              stats={stats}
              weeklyRecords={weeklyRecords}
              notificationSettings={notificationSettings}
              username={username}
              displayName={displayName}
            />
          }
          socialFeedContent={<SocialFeedTab />}
          notificationsContent={<SocialNotificationsTab />}
          unreadCount={unreadCount}
        />
      </div>
    </PageLayout>
  )
}
