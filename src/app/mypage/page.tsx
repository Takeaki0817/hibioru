import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSection } from '@/features/mypage/components/profile-section'
import { StreakDisplay } from '@/features/streak/components/streak-display'
import { HotsureDisplay } from '@/features/hotsure/components/hotsure-display'
import { NotificationSettings } from '@/features/notification/components/notification-settings'
import { AppearanceSection } from '@/features/mypage/components/appearance-section'
import { ExportSection } from '@/features/mypage/components/export-section'
import { LogoutButton } from '@/features/mypage/components/logout-button'
import { PageLayout } from '@/components/layouts/page-layout'
import { getStreakInfo, getWeeklyRecords } from '@/features/streak/api/service'
import { getNotificationSettings } from '@/features/notification/api/service'
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

  // ストリーク・ほつれ・通知設定を並列取得（パフォーマンス最適化）
  const [streakResult, weeklyResult, notificationResult] = await Promise.all([
    getStreakInfo(user.id),
    getWeeklyRecords(user.id),
    getNotificationSettings(user.id),
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

  return (
    <PageLayout>
      <div className="container mx-auto p-4 max-w-2xl pb-6">
        <h1 className="sr-only">ヒビオル</h1>
        <h2 className="text-2xl font-bold mb-6">マイページ</h2>

        {/* プロフィールセクション */}
        <ProfileSection user={user} />

        {/* 統計情報セクション */}
        <div className="mt-6 space-y-4">
          <StreakDisplay
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
            weeklyRecords={weeklyRecords}
          />
          <HotsureDisplay
            remaining={stats.hotsureRemaining}
            max={stats.hotsureMax}
          />
        </div>

        {/* 通知設定セクション */}
        <div className="mt-6">
          <NotificationSettings initialSettings={notificationSettings} />
        </div>

        {/* 外観設定セクション */}
        <div className="mt-6">
          <AppearanceSection />
        </div>

        {/* データエクスポートセクション */}
        <div className="mt-6">
          <ExportSection />
        </div>

        {/* ログアウトボタン */}
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </PageLayout>
  )
}
