import { fetchEntries, fetchCalendarData, fetchAllEntryDates } from '../queries'

// Supabase クライアントをモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// logger をモック
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

import { createClient } from '@/lib/supabase/client'

// テストデータ
const TEST_USER_ID = 'test-user-001'

const MOCK_ENTRIES = [
  {
    id: '1',
    user_id: TEST_USER_ID,
    content: '今日も頑張った',
    image_urls: null,
    created_at: '2026-01-17T14:30:00+09:00',
  },
  {
    id: '2',
    user_id: TEST_USER_ID,
    content: '朝から活動的だった',
    image_urls: ['https://example.com/img1.jpg'],
    created_at: '2026-01-17T09:00:00+09:00',
  },
  {
    id: '3',
    user_id: TEST_USER_ID,
    content: '昨日の記録',
    image_urls: null,
    created_at: '2026-01-16T20:00:00+09:00',
  },
]

describe('fetchEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('正常系: 指定ユーザーの投稿をcreated_at降順で取得', async () => {
    // Arrange
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: MOCK_ENTRIES.slice(0, 2),
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })
    mockEq.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ order: mockOrder })
    mockOrder.mockReturnValueOnce({ limit: mockLimit })

    // Act
    const result = await fetchEntries({
      userId: TEST_USER_ID,
      limit: 20,
    })

    // Assert
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].content).toBe('今日も頑張った')
    expect(result.nextCursor).toBeNull()
  })

  it('カーソルベースページネーション: beforeキー方向', async () => {
    // Arrange
    const cursor = '2026-01-17T14:30:00+09:00'
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockLt = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: MOCK_ENTRIES.slice(1, 3),
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })
    mockEq.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ lt: mockLt })
    mockLt.mockReturnValueOnce({ order: mockOrder })
    mockOrder.mockReturnValueOnce({ limit: mockLimit })

    // Act
    const result = await fetchEntries({
      userId: TEST_USER_ID,
      cursor,
      direction: 'before',
      limit: 20,
    })

    // Assert
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].content).toBe('朝から活動的だった')
  })

  it('カーソルベースページネーション: afterキー方向', async () => {
    // Arrange
    const cursor = '2026-01-16T20:00:00+09:00'
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockGt = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: MOCK_ENTRIES.slice(0, 2),
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })
    mockEq.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ gt: mockGt })
    mockGt.mockReturnValueOnce({ order: mockOrder })
    mockOrder.mockReturnValueOnce({ limit: mockLimit })

    // Act
    const result = await fetchEntries({
      userId: TEST_USER_ID,
      cursor,
      direction: 'after',
      limit: 20,
    })

    // Assert
    expect(result.entries).toHaveLength(2)
  })

  it('限界値: limit上限の50と空配列での動作', async () => {
    // Arrange - 空配列
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })
    mockEq.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ order: mockOrder })
    mockOrder.mockReturnValueOnce({ limit: mockLimit })

    // Act
    const result = await fetchEntries({
      userId: TEST_USER_ID,
      limit: 50,
    })

    // Assert
    expect(result.entries).toHaveLength(0)
    expect(result.nextCursor).toBeNull()
  })

  it('エラーハンドリング: ネットワークエラー時に例外をスロー', async () => {
    // Arrange
    const mockError = new Error('Network error')
    const mockSelect = jest.fn().mockReturnThis()
    const mockEq = jest.fn().mockReturnThis()
    const mockOrder = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockResolvedValue({
      data: null,
      error: mockError,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    mockSelect.mockReturnValueOnce({
      eq: mockEq,
    })
    mockEq.mockReturnValueOnce({ eq: mockEq })
    mockEq.mockReturnValueOnce({ order: mockOrder })
    mockOrder.mockReturnValueOnce({ limit: mockLimit })

    // Act & Assert
    await expect(
      fetchEntries({
        userId: TEST_USER_ID,
      })
    ).rejects.toThrow('投稿の取得に失敗しました')
  })
})

describe('fetchCalendarData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('正常系: 指定月の記録日とほつれ使用日を取得', async () => {
    // Arrange
    const mockEntriesSelect = jest.fn().mockReturnThis()
    const mockStreaksSelect = jest.fn().mockReturnThis()
    const mockEntriesChain = {
      eq: jest.fn().mockReturnThis(),
    }
    const mockStreaksChain = {
      eq: jest.fn().mockReturnThis(),
    }

    const entriesData = [
      { created_at: '2026-01-17T14:30:00+09:00' },
      { created_at: '2026-01-16T20:00:00+09:00' },
    ]
    const streaksData = {
      hotsure_used_dates: ['2026-01-15', '2026-01-10'],
    }

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'entries') {
          return { select: mockEntriesSelect }
        } else if (table === 'streaks') {
          return { select: mockStreaksSelect }
        }
      }),
    })

    mockEntriesSelect.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).gte = jest.fn().mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).lt = jest.fn().mockResolvedValueOnce({
      data: entriesData,
      error: null,
    })

    mockStreaksSelect.mockReturnValueOnce(mockStreaksChain)
    mockStreaksChain.eq.mockReturnValueOnce(mockStreaksChain)
    ;(mockStreaksChain as any).single = jest.fn().mockResolvedValueOnce({
      data: streaksData,
      error: null,
    })

    // Act
    const result = await fetchCalendarData({
      userId: TEST_USER_ID,
      year: 2026,
      month: 1,
    })

    // Assert
    expect(result.entryDates).toContain('2026-01-17')
    expect(result.entryDates).toContain('2026-01-16')
    expect(result.hotsureDates).toEqual(['2026-01-15', '2026-01-10'])
  })

  it('重複排除: 同日複数投稿時に日付は重複なし', async () => {
    // Arrange
    const mockEntriesSelect = jest.fn().mockReturnThis()
    const mockStreaksSelect = jest.fn().mockReturnThis()
    const mockEntriesChain = {
      eq: jest.fn().mockReturnThis(),
    }
    const mockStreaksChain = {
      eq: jest.fn().mockReturnThis(),
    }

    // 同日に3つの投稿
    const entriesData = [
      { created_at: '2026-01-17T20:00:00+09:00' },
      { created_at: '2026-01-17T15:00:00+09:00' },
      { created_at: '2026-01-17T10:00:00+09:00' },
    ]

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'entries') {
          return { select: mockEntriesSelect }
        } else if (table === 'streaks') {
          return { select: mockStreaksSelect }
        }
      }),
    })

    mockEntriesSelect.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).gte = jest.fn().mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).lt = jest.fn().mockResolvedValueOnce({
      data: entriesData,
      error: null,
    })

    mockStreaksSelect.mockReturnValueOnce(mockStreaksChain)
    mockStreaksChain.eq.mockReturnValueOnce(mockStreaksChain)
    ;(mockStreaksChain as any).single = jest.fn().mockResolvedValueOnce({
      data: { hotsure_used_dates: [] },
      error: null,
    })

    // Act
    const result = await fetchCalendarData({
      userId: TEST_USER_ID,
      year: 2026,
      month: 1,
    })

    // Assert
    expect(result.entryDates).toEqual(['2026-01-17'])
    expect(result.entryDates).toHaveLength(1)
  })

  it('エラーハンドリング: エントリ取得失敗時に例外をスロー', async () => {
    // Arrange
    const mockError = new Error('Query error')
    const mockEntriesSelect = jest.fn().mockReturnThis()
    const mockStreaksSelect = jest.fn().mockReturnThis()
    const mockEntriesChain = {
      eq: jest.fn().mockReturnThis(),
    }

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'entries') {
          return { select: mockEntriesSelect }
        } else if (table === 'streaks') {
          return { select: mockStreaksSelect }
        }
      }),
    })

    mockEntriesSelect.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).gte = jest.fn().mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).lt = jest.fn().mockResolvedValueOnce({
      data: null,
      error: mockError,
    })

    mockStreaksSelect.mockReturnValueOnce({ eq: jest.fn().mockReturnThis() })

    // Act & Assert
    await expect(
      fetchCalendarData({
        userId: TEST_USER_ID,
        year: 2026,
        month: 1,
      })
    ).rejects.toThrow('カレンダーデータの取得に失敗しました')
  })
})

describe('fetchAllEntryDates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('全期間日付取得: ユーザーの全記録日付を降順で取得', async () => {
    // Arrange
    const mockEntriesSelect = jest.fn().mockReturnThis()
    const mockStreaksSelect = jest.fn().mockReturnThis()
    const mockEntriesChain = {
      eq: jest.fn().mockReturnThis(),
    }
    const mockStreaksChain = {
      eq: jest.fn().mockReturnThis(),
    }

    const entriesData = [
      { created_at: '2026-01-17T14:30:00+09:00' },
      { created_at: '2026-01-16T20:00:00+09:00' },
      { created_at: '2025-12-31T10:00:00+09:00' },
    ]

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'entries') {
          return { select: mockEntriesSelect }
        } else if (table === 'streaks') {
          return { select: mockStreaksSelect }
        }
      }),
    })

    mockEntriesSelect.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).order = jest.fn().mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).then = jest.fn().mockResolvedValueOnce({
      data: entriesData,
      error: null,
    })

    mockStreaksSelect.mockReturnValueOnce(mockStreaksChain)
    mockStreaksChain.eq.mockReturnValueOnce(mockStreaksChain)
    ;(mockStreaksChain as any).single = jest.fn().mockResolvedValueOnce({
      data: { hotsure_used_dates: [] },
      error: null,
    })

    // Act
    const result = await fetchAllEntryDates({
      userId: TEST_USER_ID,
    })

    // Assert
    expect(result.entryDates).toContain('2026-01-17')
    expect(result.entryDates).toContain('2026-01-16')
    expect(result.entryDates).toContain('2025-12-31')
  })

  it('重複排除: 同日複数投稿時に日付は重複なし', async () => {
    // Arrange
    const mockEntriesSelect = jest.fn().mockReturnThis()
    const mockStreaksSelect = jest.fn().mockReturnThis()
    const mockEntriesChain = {
      eq: jest.fn().mockReturnThis(),
    }
    const mockStreaksChain = {
      eq: jest.fn().mockReturnThis(),
    }

    // 同日に2つの投稿
    const entriesData = [
      { created_at: '2026-01-17T20:00:00+09:00' },
      { created_at: '2026-01-17T10:00:00+09:00' },
    ]

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table) => {
        if (table === 'entries') {
          return { select: mockEntriesSelect }
        } else if (table === 'streaks') {
          return { select: mockStreaksSelect }
        }
      }),
    })

    mockEntriesSelect.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    mockEntriesChain.eq.mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).order = jest.fn().mockReturnValueOnce(mockEntriesChain)
    ;(mockEntriesChain as any).then = jest.fn().mockResolvedValueOnce({
      data: entriesData,
      error: null,
    })

    mockStreaksSelect.mockReturnValueOnce(mockStreaksChain)
    mockStreaksChain.eq.mockReturnValueOnce(mockStreaksChain)
    ;(mockStreaksChain as any).single = jest.fn().mockResolvedValueOnce({
      data: { hotsure_used_dates: [] },
      error: null,
    })

    // Act
    const result = await fetchAllEntryDates({
      userId: TEST_USER_ID,
    })

    // Assert
    expect(result.entryDates).toEqual(['2026-01-17'])
    expect(result.entryDates).toHaveLength(1)
  })
})
