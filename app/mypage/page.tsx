import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSection } from '@/components/mypage/ProfileSection'
import { StreakDisplay } from '@/components/mypage/StreakDisplay'
import { HotsureDisplay } from '@/components/mypage/HotsureDisplay'
import { LogoutButton } from '@/components/mypage/LogoutButton'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーはログインページにリダイレクト
  if (!user) {
    redirect('/login')
  }

  // TODO: 実際のストリーク・ほつれデータをDBから取得
  // 現在はダミーデータを使用
  const stats = {
    currentStreak: 5,
    longestStreak: 10,
    hotsureRemaining: 2,
    hotsureMax: 2,
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

      {/* ログアウトボタン */}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  )
}
