'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { FollowButton } from './follow-button'

interface UserProfileViewProps {
  user: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  currentUserId: string
  initialIsFollowing?: boolean
}

/**
 * 他ユーザーのプロフィール表示コンポーネント
 */
export function UserProfileView({ user, currentUserId, initialIsFollowing }: UserProfileViewProps) {
  const displayName = user.display_name ?? user.username ?? 'ユーザー'
  const username = user.username ?? ''

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-4">
        {/* アバター */}
        <Avatar className="size-24" data-testid="profile-avatar">
          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 text-2xl">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* ユーザー情報 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground" data-testid="profile-display-name">
            {displayName}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="profile-username">
            @{username}
          </p>
        </div>

        {/* フォローボタン（自分以外の場合のみ表示） */}
        {user.id !== currentUserId && (
          <FollowButton
            userId={user.id}
            username={displayName}
            initialIsFollowing={initialIsFollowing}
          />
        )}
      </div>
    </Card>
  )
}
