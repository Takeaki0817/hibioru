import type { User } from '@supabase/supabase-js'
import Image from 'next/image'

interface ProfileSectionProps {
  user: User
}

export function ProfileSection({ user }: ProfileSectionProps) {
  // Google OAuthから取得したアバターURLと表示名
  const avatarUrl = user.user_metadata.avatar_url as string | undefined
  const displayName = user.user_metadata.full_name as string | undefined || user.email

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4">
        {/* アバター画像 */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="プロフィール画像"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
              👤
            </div>
          )}
        </div>

        {/* ユーザー情報 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>
    </div>
  )
}
