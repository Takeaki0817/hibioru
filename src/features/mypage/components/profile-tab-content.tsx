import type { User } from '@supabase/supabase-js'
import { ProfileSection } from './profile-section'
import { ProfileEditForm } from '@/features/social/components/profile-edit-form'
import { FollowStatsSection } from '@/features/social/components/follow-stats-section'
import { StreakDisplay } from '@/features/streak/components/streak-display'
import { HotsureDisplay } from '@/features/hotsure/components/hotsure-display'
import { NotificationSettings } from '@/features/notification/components/notification-settings'
import { AppearanceSection } from './appearance-section'
import { ExportSection } from './export-section'
import { FeedbackSection } from './feedback-section'
import { LogoutButton } from './logout-button'
import { DeleteAccountSection } from './delete-account-section'
import type { NotificationSettings as NotificationSettingsType } from '@/features/notification/types'

interface ProfileTabContentProps {
  user: User
  stats: {
    currentStreak: number
    longestStreak: number
    hotsureRemaining: number
    hotsureMax: number
  }
  weeklyRecords?: boolean[]
  notificationSettings: NotificationSettingsType
  username: string | null
  displayName: string | null
}

/**
 * プロフィールタブのコンテンツ
 * 従来のマイページ内容を包含
 */
export function ProfileTabContent({
  user,
  stats,
  weeklyRecords,
  notificationSettings,
  username,
  displayName,
}: ProfileTabContentProps) {
  return (
    <div className="space-y-6">
      {/* プロフィールセクション */}
      <ProfileSection user={user} />

      {/* プロフィール編集 */}
      <ProfileEditForm
        initialUsername={username}
        initialDisplayName={displayName}
      />

      {/* フォロー統計セクション */}
      <FollowStatsSection />

      {/* 統計情報セクション */}
      <div className="space-y-4">
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
      <NotificationSettings initialSettings={notificationSettings} />

      {/* 外観設定セクション */}
      <AppearanceSection />

      {/* データエクスポートセクション */}
      <ExportSection />

      {/* フィードバックセクション */}
      <FeedbackSection />

      {/* ログアウトボタン */}
      <div className="pt-2">
        <LogoutButton />
      </div>

      {/* アカウント削除セクション */}
      <DeleteAccountSection />
    </div>
  )
}
