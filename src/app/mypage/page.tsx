import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSection } from '@/features/mypage/components/profile-section'
import { StreakDisplay } from '@/features/streak/components/streak-display'
import { HotsureDisplay } from '@/features/hotsure/components/hotsure-display'
import { NotificationSettings } from '@/features/notification/components/notification-settings'
import { ExportSection } from '@/features/mypage/components/export-section'
import { LogoutButton } from '@/features/mypage/components/logout-button'
import { FooterNav } from '@/components/layouts/footer-nav'
import { getStreakInfo } from '@/features/streak/api/service'
import { getNotificationSettings } from '@/features/notification/api/service'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーはログインページにリダイレクト
  if (!user) {
    redirect('/login')
  }

  // 実際のストリーク・ほつれデータをDBから取得
  const streakResult = await getStreakInfo(user.id)
  const stats = {
    currentStreak: streakResult.ok ? streakResult.value.currentStreak : 0,
    longestStreak: streakResult.ok ? streakResult.value.longestStreak : 0,
    hotsureRemaining: streakResult.ok ? streakResult.value.hotsureRemaining : 2,
    hotsureMax: 2,
  }

  // 通知設定を取得
  const notificationResult = await getNotificationSettings(user.id)
  const notificationSettings = notificationResult.ok
    ? notificationResult.value
    : {
        user_id: user.id,
        enabled: false,
        main_reminder_time: '21:00',
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
      }

  return (
    <>
      <div className="container mx-auto p-4 max-w-2xl pb-24">
        <h1 className="text-2xl font-bold mb-6">マイページ</h1>

        {/* プロフィールセクション */}
        <ProfileSection user={user} />

        {/* 統計情報セクション */}
        <div className="mt-6 space-y-4">
          <StreakDisplay
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
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

        {/* データエクスポートセクション */}
        <div className="mt-6">
          <ExportSection />
        </div>

        {/* ログアウトボタン */}
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>

      <FooterNav />
    </>
  )
}
