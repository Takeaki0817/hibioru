import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layouts/page-layout'
import { SocialHeader } from '@/features/social/components/social-header'
import { SocialTabs } from '@/features/social/components/social-tabs'
import { SocialFeedTab } from '@/features/social/components/social-feed-tab'
import { SocialNotificationsTab } from '@/features/social/components/social-notifications-tab'
import { getStreakInfo, getWeeklyRecords } from '@/features/streak/api/service'
import { getNotificationSettings } from '@/features/notification/api/service'
import { DEFAULT_REMINDERS } from '@/features/notification/types'

// プロフィールタブで使用するコンポーネント（app層での統合）
import { ProfileSection } from '@/features/social/components/profile-section'
import { ProfileEditForm } from '@/features/social/components/profile-edit-form'
import { StreakDisplay } from '@/features/streak/components/streak-display'
import { HotsureDisplay } from '@/features/hotsure/components/hotsure-display'
import { NotificationSettings } from '@/features/notification/components/notification-settings'
import { AppearanceSection } from '@/features/social/components/appearance-section'
import { ExportSection } from '@/features/social/components/export-section'
import { FeedbackSection } from '@/features/social/components/feedback-section'
import { LegalLinksSection } from '@/features/social/components/legal-links-section'
import { LogoutButton } from '@/features/social/components/logout-button'
import { DeleteAccountSection } from '@/features/social/components/delete-account-section'
import { BillingSection } from '@/features/billing/components/billing-section'

export const metadata: Metadata = {
  title: 'ソーシャル - ヒビオル',
  description: 'ストリーク、ほつれ、通知設定の管理',
}

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーはログインページにリダイレクト
  if (!user) {
    redirect('/')
  }

  // ストリーク・ほつれ・通知設定・プロフィールを並列取得（パフォーマンス最適化）
  const [streakResult, weeklyResult, notificationResult, profileResult] = await Promise.all([
    getStreakInfo(user.id),
    getWeeklyRecords(user.id),
    getNotificationSettings(user.id),
    supabase.from('users').select('username, display_name').eq('id', user.id).single(),
  ])

  const stats = {
    currentStreak: streakResult.ok ? streakResult.value.currentStreak : 0,
    longestStreak: streakResult.ok ? streakResult.value.longestStreak : 0,
    hotsureRemaining: streakResult.ok ? streakResult.value.hotsureRemaining : 2,
    hotsureMax: 2,
  }
  const weeklyRecords = weeklyResult.ok ? weeklyResult.value.entries : undefined
  const hotsureRecords = weeklyResult.ok ? weeklyResult.value.hotsures : undefined
  const notificationSettings = notificationResult.ok
    ? notificationResult.value
    : {
        user_id: user.id,
        enabled: false,
        reminders: DEFAULT_REMINDERS,
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
        follow_up_max_count: 2,
        social_notifications_enabled: true,
      }
  const profileData = profileResult.data
  const username = profileData?.username ?? null
  const displayName = profileData?.display_name ?? user.user_metadata?.full_name ?? null

  // プロフィールタブのコンテンツ（app層での統合）
  const profileTabContent = (
    <div className="space-y-6">
      {/* プロフィールセクション */}
      <ProfileSection user={user} />

      {/* プロフィール編集 */}
      <ProfileEditForm
        initialUsername={username}
        initialDisplayName={displayName}
      />

      {/* 統計情報セクション */}
      <div className="space-y-4">
        <StreakDisplay
          currentStreak={stats.currentStreak}
          longestStreak={stats.longestStreak}
          weeklyRecords={weeklyRecords}
          hotsureRecords={hotsureRecords}
        />
        <HotsureDisplay
          remaining={stats.hotsureRemaining}
          max={stats.hotsureMax}
        />
      </div>

      {/* 通知設定セクション */}
      <NotificationSettings initialSettings={notificationSettings} />

      {/* 外観設定セクション */}
      <AppearanceSection />

      {/* プラン・お支払いセクション */}
      <BillingSection />

      {/* データエクスポートセクション */}
      <ExportSection />

      {/* フィードバックセクション */}
      <FeedbackSection />

      {/* 法的情報セクション */}
      <LegalLinksSection />

      {/* ログアウトボタン */}
      <div className="pt-2">
        <LogoutButton />
      </div>

      {/* アカウント削除セクション */}
      <DeleteAccountSection />
    </div>
  )

  return (
    <PageLayout header={<SocialHeader />} mainClassName="overflow-hidden">
      <div className="container mx-auto max-w-2xl h-full">
        <SocialTabs
          profileContent={profileTabContent}
          socialFeedContent={<SocialFeedTab />}
          notificationsContent={<SocialNotificationsTab />}
        />
      </div>
    </PageLayout>
  )
}
