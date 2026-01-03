// TanStack Query のキー管理
// 階層的なキー構造により、関連クエリをまとめて無効化可能

export const queryKeys = {
  // entries関連（タイムライン、カレンダー等）
  entries: {
    all: ['entries'] as const,
    timeline: (userId: string, cursor?: string) =>
      [...queryKeys.entries.all, 'timeline', userId, cursor] as const,
    calendar: (userId: string, year: number, month: number) =>
      [...queryKeys.entries.all, 'calendar', userId, year, month] as const,
    dates: (userId: string) =>
      [...queryKeys.entries.all, 'dates', userId] as const,
  },

  // notification関連
  notification: {
    all: ['notification'] as const,
    settings: (userId: string) =>
      [...queryKeys.notification.all, 'settings', userId] as const,
  },

  // social関連
  social: {
    all: ['social'] as const,
    feed: (cursor?: string) =>
      [...queryKeys.social.all, 'feed', cursor] as const,
    notifications: (cursor?: string) =>
      [...queryKeys.social.all, 'notifications', cursor] as const,
    unreadCount: () =>
      [...queryKeys.social.all, 'unreadCount'] as const,
    followStatus: (userId: string) =>
      [...queryKeys.social.all, 'followStatus', userId] as const,
    followCounts: (userId: string) =>
      [...queryKeys.social.all, 'followCounts', userId] as const,
    userSearch: (query: string) =>
      [...queryKeys.social.all, 'userSearch', query] as const,
    profile: (username: string) =>
      [...queryKeys.social.all, 'profile', username] as const,
    userAchievements: (userId: string, cursor?: string) =>
      [...queryKeys.social.all, 'userAchievements', userId, cursor] as const,
  },
} as const
