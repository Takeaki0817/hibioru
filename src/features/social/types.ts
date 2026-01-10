import type { Result } from '@/lib/types/result'

// 達成種別
export type AchievementType =
  | 'daily_posts'   // 1日の投稿数
  | 'total_posts'   // 総投稿数
  | 'streak_days'   // 継続日数
  | 'shared_entry'  // 共有投稿

// ソーシャル通知種別
export type SocialNotificationType = 'celebration' | 'follow'

// ユーザー公開情報（検索・表示用）
export interface PublicUserInfo {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

// フォロー関係
export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

// フォロー数
export interface FollowCounts {
  followingCount: number
  followerCount: number
}

// 達成イベント
export interface Achievement {
  id: string
  userId: string
  type: AchievementType
  threshold: number
  value: number
  entryId: string | null
  isShared: boolean
  createdAt: string
}

// お祝い
export interface Celebration {
  id: string
  achievementId: string
  fromUserId: string
  createdAt: string
}

// ソーシャル通知
export interface SocialNotification {
  id: string
  userId: string
  type: SocialNotificationType
  fromUserId: string
  achievementId: string | null
  isRead: boolean
  createdAt: string
}

// ソーシャルフィードアイテム
export interface SocialFeedItem {
  id: string
  type: 'achievement' | 'shared_entry'
  user: PublicUserInfo
  achievement?: {
    type: AchievementType
    threshold: number
    value: number
  }
  entry?: {
    id: string
    content: string
    imageUrls: string[] | null
  }
  celebrationCount: number
  isCelebrated: boolean  // 自分がお祝い済みか
  createdAt: string
}

// ソーシャル通知アイテム（表示用）
export interface SocialNotificationItem {
  id: string
  type: SocialNotificationType
  fromUser: PublicUserInfo
  achievement?: {
    type: AchievementType
    threshold: number
  }
  createdAt: string
}

// プロフィール更新入力
export interface UpdateProfileInput {
  displayName?: string
  username?: string
}

// エラー型
export interface SocialError {
  code:
    | 'DB_ERROR'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'ALREADY_FOLLOWING'
    | 'NOT_FOLLOWING'
    | 'SELF_FOLLOW'
    | 'ALREADY_CELEBRATED'
    | 'NOT_CELEBRATED'
    | 'USERNAME_TAKEN'
    | 'INVALID_USERNAME'
    | 'INVALID_DISPLAY_NAME'
    | 'RATE_LIMITED'
  message: string
}

// Result型のエイリアス
export type SocialResult<T> = Result<T, SocialError>

// ページネーション結果
export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
}

// ソーシャルフィード結果
export type SocialFeedResult = PaginatedResult<SocialFeedItem>

// ソーシャル通知結果
export type SocialNotificationsResult = PaginatedResult<SocialNotificationItem>

// ユーザー検索結果
export type UserSearchResult = PaginatedResult<PublicUserInfo>
