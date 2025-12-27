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
} as const
