import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSection } from '@/components/mypage/ProfileSection'
import { StreakDisplay } from '@/components/mypage/StreakDisplay'
import { HotsureDisplay } from '@/components/mypage/HotsureDisplay'
import { NotificationSettings } from '@/components/mypage/NotificationSettings'
import { ExportSection } from '@/components/mypage/ExportSection'
import { LogoutButton } from '@/components/mypage/LogoutButton'
import { getStreakInfo } from '@/lib/streak/service'
import { getNotificationSettings } from '@/lib/notification/service'

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
    <div className="container mx-auto p-4 max-w-2xl">
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
  )
}
