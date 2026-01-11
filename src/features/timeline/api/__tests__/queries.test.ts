/**
 * timeline/api/queries.ts のユニットテスト
 * @jest-environment node
 */

import {
  fetchEntries,
  fetchCalendarData,
  fetchAllEntryDates,
} from '../queries'

// Supabaseクライアントのモック
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockLt = jest.fn()
const mockGt = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()
const mockSingle = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// チェーンメソッドのモックヘルパー
const createChainMock = () => ({
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  order: mockOrder.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
  lt: mockLt.mockReturnThis(),
  gt: mockGt.mockReturnThis(),
  gte: mockGte.mockReturnThis(),
  lte: mockLte.mockReturnThis(),
  single: mockSingle,
})

describe('queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchEntries', () => {
    it('エントリ一覧を取得できること', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          content: 'テスト投稿1',
          image_urls: null,
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'entry-2',
          user_id: 'user-1',
          content: 'テスト投稿2',
          image_urls: ['https://example.com/image.jpg'],
          created_at: '2024-01-15T09:00:00Z',
        },
      ]

      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({ data: mockEntries, error: null })

      // Act
      const result = await fetchEntries({ userId: 'user-1' })

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('entries')
      expect(mockSelect).toHaveBeenCalledWith('id, user_id, content, image_urls, created_at')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockEq).toHaveBeenCalledWith('is_deleted', false)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(21) // limit + 1

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].id).toBe('entry-1')
      expect(result.entries[0].content).toBe('テスト投稿1')
    })

    it('カーソルベースページネーション（before）で過去のエントリを取得できること', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'entry-3',
          user_id: 'user-1',
          content: '過去の投稿',
          image_urls: null,
          created_at: '2024-01-14T10:00:00Z',
        },
      ]

      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockReturnValue(chain)
      mockLt.mockResolvedValue({ data: mockEntries, error: null })

      // Act
      const result = await fetchEntries({
        userId: 'user-1',
        cursor: '2024-01-15T10:00:00Z',
        direction: 'before',
      })

      // Assert
      expect(mockLt).toHaveBeenCalledWith('created_at', '2024-01-15T10:00:00Z')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('entry-3')
    })

    it('カーソルベースページネーション（after）で新しいエントリを取得できること', async () => {
      // Arrange
      const mockEntries = [
        {
          id: 'entry-new',
          user_id: 'user-1',
          content: '新しい投稿',
          image_urls: null,
          created_at: '2024-01-16T10:00:00Z',
        },
      ]

      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockReturnValue(chain)
      mockGt.mockResolvedValue({ data: mockEntries, error: null })

      // Act
      const result = await fetchEntries({
        userId: 'user-1',
        cursor: '2024-01-15T10:00:00Z',
        direction: 'after',
      })

      // Assert
      expect(mockGt).toHaveBeenCalledWith('created_at', '2024-01-15T10:00:00Z')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].id).toBe('entry-new')
    })

    it('次ページの有無を正しく判定できること', async () => {
      // Arrange: limit+1件のデータを返す（次ページあり）
      const mockEntries = Array.from({ length: 21 }, (_, i) => ({
        id: `entry-${i}`,
        user_id: 'user-1',
        content: `投稿${i}`,
        image_urls: null,
        // 日時を1時間ずつずらして有効な値を生成
        created_at: new Date(Date.UTC(2024, 0, 15, 10, 0, 0) - i * 60 * 60 * 1000).toISOString(),
      }))

      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({ data: mockEntries, error: null })

      // Act
      const result = await fetchEntries({ userId: 'user-1', limit: 20 })

      // Assert
      expect(result.entries).toHaveLength(20) // limit件に切り詰められる
      expect(result.nextCursor).not.toBeNull() // 次ページあり
      expect(result.nextCursor).toBe(mockEntries[19].created_at)
    })

    it('次ページがない場合はnextCursorがnullになること', async () => {
      // Arrange: limit未満のデータを返す（次ページなし）
      const mockEntries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        user_id: 'user-1',
        content: `投稿${i}`,
        image_urls: null,
        created_at: `2024-01-15T${String(10 - i).padStart(2, '0')}:00:00Z`,
      }))

      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({ data: mockEntries, error: null })

      // Act
      const result = await fetchEntries({ userId: 'user-1', limit: 20 })

      // Assert
      expect(result.entries).toHaveLength(5)
      expect(result.nextCursor).toBeNull() // 次ページなし
    })

    it('空の結果を正しく処理できること', async () => {
      // Arrange
      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({ data: [], error: null })

      // Act
      const result = await fetchEntries({ userId: 'user-1' })

      // Assert
      expect(result.entries).toHaveLength(0)
      expect(result.nextCursor).toBeNull()
      expect(result.prevCursor).toBeNull()
    })

    it('dataがnullの場合に空の結果を返すこと', async () => {
      // Arrange
      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({ data: null, error: null })

      // Act
      const result = await fetchEntries({ userId: 'user-1' })

      // Assert
      expect(result.entries).toHaveLength(0)
      expect(result.nextCursor).toBeNull()
      expect(result.prevCursor).toBeNull()
    })

    it('エラー時に例外をスローすること', async () => {
      // Arrange
      const chain = createChainMock()
      mockFrom.mockReturnValue(chain)
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      // Act & Assert
      await expect(fetchEntries({ userId: 'user-1' })).rejects.toThrow(
        '投稿の取得に失敗しました: Database connection failed'
      )
    })
  })

  describe('fetchCalendarData', () => {
    it('月間のエントリ日付を取得できること', async () => {
      // Arrange
      const mockEntriesData = [
        { created_at: '2024-01-10T10:00:00Z' },
        { created_at: '2024-01-15T14:00:00Z' },
        { created_at: '2024-01-20T09:00:00Z' },
      ]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockLte.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act
      const result = await fetchCalendarData({
        userId: 'user-1',
        year: 2024,
        month: 1,
      })

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('entries')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockEq).toHaveBeenCalledWith('is_deleted', false)
      expect(result.entryDates).toHaveLength(3)
      // JSTに変換されているので日付を確認
      expect(result.entryDates).toContain('2024-01-10')
      expect(result.entryDates).toContain('2024-01-15')
      expect(result.entryDates).toContain('2024-01-20')
    })

    it('ほつれ使用日も取得できること', async () => {
      // Arrange
      const mockEntriesData = [{ created_at: '2024-01-15T10:00:00Z' }]
      const mockStreaksData = {
        hotsure_used_dates: ['2024-01-12', '2024-01-18'],
      }

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockLte.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: mockStreaksData, error: null })

      // Act
      const result = await fetchCalendarData({
        userId: 'user-1',
        year: 2024,
        month: 1,
      })

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('streaks')
      expect(result.hotsureDates).toEqual(['2024-01-12', '2024-01-18'])
    })

    it('重複日付を除去できること', async () => {
      // Arrange: 同じ日に複数投稿がある場合
      const mockEntriesData = [
        { created_at: '2024-01-15T09:00:00Z' },
        { created_at: '2024-01-15T14:00:00Z' },
        { created_at: '2024-01-15T18:00:00Z' },
        { created_at: '2024-01-16T10:00:00Z' },
      ]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockLte.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act
      const result = await fetchCalendarData({
        userId: 'user-1',
        year: 2024,
        month: 1,
      })

      // Assert: 同じ日は1つにまとめられる
      expect(result.entryDates).toHaveLength(2)
      expect(result.entryDates).toContain('2024-01-15')
      expect(result.entryDates).toContain('2024-01-16')
    })

    it('streaksエラー時はログ出力のみで処理を継続すること', async () => {
      // Arrange
      const { logger } = await import('@/lib/logger')
      const mockEntriesData = [{ created_at: '2024-01-15T10:00:00Z' }]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockLte.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Streaks not found' },
      })

      // Act
      const result = await fetchCalendarData({
        userId: 'user-1',
        year: 2024,
        month: 1,
      })

      // Assert: streaksエラーでも処理は継続
      expect(logger.error).toHaveBeenCalledWith('ストリーク取得失敗', 'Streaks not found')
      expect(result.entryDates).toHaveLength(1)
      expect(result.hotsureDates).toEqual([])
    })

    it('entriesエラー時に例外をスローすること', async () => {
      // Arrange
      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockLte.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act & Assert
      await expect(
        fetchCalendarData({
          userId: 'user-1',
          year: 2024,
          month: 1,
        })
      ).rejects.toThrow('カレンダーデータの取得に失敗しました: Database error')
    })
  })

  describe('fetchAllEntryDates', () => {
    it('全期間のエントリ日付を取得できること', async () => {
      // Arrange
      const mockEntriesData = [
        { created_at: '2024-03-15T10:00:00Z' },
        { created_at: '2024-02-20T14:00:00Z' },
        { created_at: '2024-01-10T09:00:00Z' },
      ]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act
      const result = await fetchAllEntryDates({ userId: 'user-1' })

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('entries')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.entryDates).toHaveLength(3)
      expect(result.entryDates).toContain('2024-03-15')
      expect(result.entryDates).toContain('2024-02-20')
      expect(result.entryDates).toContain('2024-01-10')
    })

    it('ほつれ使用日も取得できること', async () => {
      // Arrange
      const mockEntriesData = [{ created_at: '2024-01-15T10:00:00Z' }]
      const mockStreaksData = {
        hotsure_used_dates: ['2024-01-05', '2024-01-08', '2024-01-12'],
      }

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: mockStreaksData, error: null })

      // Act
      const result = await fetchAllEntryDates({ userId: 'user-1' })

      // Assert
      expect(result.hotsureDates).toEqual(['2024-01-05', '2024-01-08', '2024-01-12'])
    })

    it('重複日付を除去できること', async () => {
      // Arrange: 同じ日（JST）に複数投稿
      // JST 2024-01-15 の範囲は UTC 2024-01-14T15:00:00Z ~ 2024-01-15T14:59:59Z
      const mockEntriesData = [
        { created_at: '2024-01-15T00:00:00Z' }, // JST 2024-01-15T09:00:00
        { created_at: '2024-01-15T05:00:00Z' }, // JST 2024-01-15T14:00:00
        { created_at: '2024-01-14T16:00:00Z' }, // JST 2024-01-15T01:00:00（同じJST日）
        { created_at: '2024-01-14T10:00:00Z' }, // JST 2024-01-14T19:00:00（前日）
      ]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act
      const result = await fetchAllEntryDates({ userId: 'user-1' })

      // Assert: JST基準で重複除去されるので2日分
      expect(result.entryDates).toHaveLength(2)
      expect(result.entryDates).toContain('2024-01-15')
      expect(result.entryDates).toContain('2024-01-14')
    })

    it('streaksエラー時はログ出力のみで処理を継続すること', async () => {
      // Arrange
      const { logger } = await import('@/lib/logger')
      const mockEntriesData = [{ created_at: '2024-01-15T10:00:00Z' }]

      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({ data: mockEntriesData, error: null })
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Streaks record not found' },
      })

      // Act
      const result = await fetchAllEntryDates({ userId: 'user-1' })

      // Assert
      expect(logger.error).toHaveBeenCalledWith('ストリーク取得失敗', 'Streaks record not found')
      expect(result.entryDates).toHaveLength(1)
      expect(result.hotsureDates).toEqual([])
    })

    it('entriesエラー時に例外をスローすること', async () => {
      // Arrange
      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      })
      mockSingle.mockResolvedValue({ data: { hotsure_used_dates: [] }, error: null })

      // Act & Assert
      await expect(fetchAllEntryDates({ userId: 'user-1' })).rejects.toThrow(
        '投稿日付の取得に失敗しました: Query failed'
      )
    })

    it('空のエントリでも正しく処理できること', async () => {
      // Arrange
      const entriesChain = createChainMock()
      const streaksChain = createChainMock()

      mockFrom.mockImplementation((table: string) => {
        if (table === 'entries') return entriesChain
        if (table === 'streaks') return streaksChain
        return entriesChain
      })

      mockOrder.mockResolvedValue({ data: [], error: null })
      mockSingle.mockResolvedValue({
        data: { hotsure_used_dates: ['2024-01-10'] },
        error: null,
      })

      // Act
      const result = await fetchAllEntryDates({ userId: 'user-1' })

      // Assert
      expect(result.entryDates).toEqual([])
      expect(result.hotsureDates).toEqual(['2024-01-10'])
    })
  })
})
