import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfileSectionProps {
  user: User
}

export function ProfileSection({ user }: ProfileSectionProps) {
  // Google OAuthから取得したアバターURLと表示名
  const avatarUrl = user.user_metadata.avatar_url as string | undefined
  const displayName = user.user_metadata.full_name as string | undefined || user.email

  return (
    <Card data-testid="profile-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">アカウント</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* アバター画像 */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${displayName}のプロフィール画像`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                👤
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div>
            <h2 className="text-lg font-semibold text-foreground" data-testid="my-display-name">{displayName}</h2>
            <p className="text-sm text-muted-foreground" data-testid="my-username">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
