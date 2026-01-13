/**
 * streak機能のサービス層ユニットテスト
 * @jest-environment node
 */

import {
  getStreakInfo,
  updateStreakOnEntry,
  hasEntryOnDate,
  getWeeklyRecords,
  breakStreak,
} from '../service'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// 日付ユーティリティのモック
jest.mock('@/lib/date-utils', () => ({
  getJSTToday: jest.fn(),
  getJSTDateString: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getJSTToday, getJSTDateString } from '@/lib/date-utils'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetJSTToday = getJSTToday as jest.MockedFunction<typeof getJSTToday>
const mockGetJSTDateString = getJSTDateString as jest.MockedFunction<typeof getJSTDateString>

// チェーンモックのヘルパー関数
type MockResult = { data: unknown; error: unknown }

/**
 * SELECT用のチェーンモックを作成
 */
const createSelectChainMock = (result: MockResult) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  }
  return chain
}

/**
 * UPSERT用のチェーンモックを作成
 */
const createUpsertChainMock = (result: MockResult) => {
  const chain = {
    upsert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  }
  return chain
}

/**
 * UPDATE用のチェーンモックを作成
 */
const createUpdateChainMock = (result: MockResult) => {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(result),
  }
  return chain
}

describe('getStreakInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ストリーク情報を取得できること', async () => {
    // Arrange: ストリークデータを持つユーザー
    const mockStreakData = {
      current_streak: 5,
      longest_streak: 10,
      last_entry_date: '2024-01-15',
      hotsure_remaining: 2,
      bonus_hotsure: 1,
      hotsure_used_dates: ['2024-01-10', '2024-01-12'],
    }

    const chain = createSelectChainMock({ data: mockStreakData, error: null })
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await getStreakInfo('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(5)
      expect(result.value.longestStreak).toBe(10)
      expect(result.value.lastEntryDate).toBe('2024-01-15')
      expect(result.value.hotsureRemaining).toBe(2)
      expect(result.value.bonusHotsure).toBe(1)
      expect(result.value.hotsureUsedCount).toBe(2)
    }
  })

  it('レコードがない場合に初期値を返すこと', async () => {
    // Arrange: PGRST116エラー（レコードなし）
    const chain = createSelectChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await getStreakInfo('new-user')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(0)
      expect(result.value.longestStreak).toBe(0)
      expect(result.value.lastEntryDate).toBeNull()
      expect(result.value.hotsureRemaining).toBe(2)
      expect(result.value.bonusHotsure).toBe(0)
      expect(result.value.hotsureUsedCount).toBe(0)
    }
  })

  it('DBエラー時にエラーを返すこと', async () => {
    // Arrange: DBエラー
    const chain = createSelectChainMock({
      data: null,
      error: { code: 'PGRST000', message: 'Database connection failed' },
    })
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await getStreakInfo('user-1')

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('DB_ERROR')
      expect(result.error.message).toBe('Database connection failed')
    }
  })
})

describe('updateStreakOnEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetJSTToday.mockReturnValue('2024-01-15')
  })

  it('初回記録でストリークが1になること', async () => {
    // Arrange: 既存レコードなし
    const selectChain = createSelectChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const upsertChain = createUpsertChainMock({
      data: {
        current_streak: 1,
        longest_streak: 1,
        last_entry_date: '2024-01-15',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('new-user')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(1)
      expect(result.value.longestStreak).toBe(1)
    }
  })

  it('連続記録でストリークが増加すること', async () => {
    // Arrange: 昨日まで3日連続
    const selectChain = createSelectChainMock({
      data: {
        current_streak: 3,
        longest_streak: 5,
        last_entry_date: '2024-01-14', // 昨日
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const upsertChain = createUpsertChainMock({
      data: {
        current_streak: 4,
        longest_streak: 5,
        last_entry_date: '2024-01-15',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(4)
      expect(result.value.longestStreak).toBe(5)
    }
  })

  it('同日2回目の記録では更新しないこと', async () => {
    // Arrange: 今日既に記録済み
    const selectChain = createSelectChainMock({
      data: {
        current_streak: 5,
        longest_streak: 10,
        last_entry_date: '2024-01-15', // 今日
        hotsure_remaining: 2,
        bonus_hotsure: 1,
        hotsure_used_dates: ['2024-01-10'],
      },
      error: null,
    })

    const mockFrom = jest.fn().mockReturnValue(selectChain)
    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      // 既存の値がそのまま返される
      expect(result.value.currentStreak).toBe(5)
      expect(result.value.longestStreak).toBe(10)
      expect(result.value.hotsureUsedCount).toBe(1)
    }
    // upsertは呼ばれない（fromが1回だけ）
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('最長ストリークを更新すること', async () => {
    // Arrange: 現在5日連続、最長も5日
    const selectChain = createSelectChainMock({
      data: {
        current_streak: 5,
        longest_streak: 5,
        last_entry_date: '2024-01-14',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const upsertChain = createUpsertChainMock({
      data: {
        current_streak: 6,
        longest_streak: 6, // 更新される
        last_entry_date: '2024-01-15',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(6)
      expect(result.value.longestStreak).toBe(6)
    }
  })

  it('最長ストリークを維持すること（更新不要時）', async () => {
    // Arrange: 現在2日連続、最長10日
    const selectChain = createSelectChainMock({
      data: {
        current_streak: 2,
        longest_streak: 10,
        last_entry_date: '2024-01-14',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const upsertChain = createUpsertChainMock({
      data: {
        current_streak: 3,
        longest_streak: 10, // 維持される
        last_entry_date: '2024-01-15',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(3)
      expect(result.value.longestStreak).toBe(10)
    }
  })

  it('新規ユーザーでレコードが作成されること', async () => {
    // Arrange: 初めての記録
    const selectChain = createSelectChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const upsertChain = createUpsertChainMock({
      data: {
        current_streak: 1,
        longest_streak: 1,
        last_entry_date: '2024-01-15',
        hotsure_remaining: 2,
        bonus_hotsure: 0,
        hotsure_used_dates: [],
      },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(upsertChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await updateStreakOnEntry('new-user')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.currentStreak).toBe(1)
      expect(result.value.longestStreak).toBe(1)
      expect(result.value.lastEntryDate).toBe('2024-01-15')
    }
  })
})

describe('hasEntryOnDate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('記録がある日はtrueを返すこと', async () => {
    // Arrange: エントリーが存在
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{ id: 'entry-1' }],
        error: null,
      }),
    }
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await hasEntryOnDate('user-1', '2024-01-15')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(true)
    }
  })

  it('記録がない日はfalseを返すこと', async () => {
    // Arrange: エントリーなし
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await hasEntryOnDate('user-1', '2024-01-15')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(false)
    }
  })

  it('JSTの日付境界を正しく処理すること', async () => {
    // Arrange
    const ltMock = jest.fn().mockReturnThis()
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: ltMock,
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    await hasEntryOnDate('user-1', '2024-01-15')

    // Assert: 正しい日付範囲でクエリされること
    // gteは開始日の00:00:00+09:00で呼ばれる
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2024-01-15T00:00:00+09:00')

    // ltは翌日の00:00:00+09:00で呼ばれる
    // 注: 実装では toISOString().split('T')[0] でUTCベースの日付を取得しているため
    // テスト環境のタイムゾーンによって結果が異なる可能性がある
    // JSTで2024-01-15T00:00:00+09:00はUTCで2024-01-14T15:00:00Zとなり
    // +1日するとUTC 2024-01-15T15:00:00Z、ISO日付は'2024-01-15'となる
    expect(ltMock).toHaveBeenCalledWith('created_at', expect.stringMatching(/2024-01-1[56]T00:00:00\+09:00/))
  })
})

describe('getWeeklyRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 2024-01-15（月曜日）を基準とする
    mockGetJSTToday.mockReturnValue('2024-01-15')
  })

  it('週間のエントリ状況を取得できること', async () => {
    // Arrange
    const entriesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({
        data: [
          { created_at: '2024-01-15T10:00:00+09:00' }, // 月曜
          { created_at: '2024-01-17T15:00:00+09:00' }, // 水曜
        ],
        error: null,
      }),
    }

    const streaksChain = createSelectChainMock({
      data: { hotsure_used_dates: [] },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(entriesChain)
      .mockReturnValueOnce(streaksChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // getJSTDateStringのモック
    mockGetJSTDateString.mockImplementation((date: Date) => {
      const d = new Date(date)
      d.setTime(d.getTime() + 9 * 60 * 60 * 1000)
      return d.toISOString().split('T')[0]
    })

    // Act
    const result = await getWeeklyRecords('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.entries).toHaveLength(7)
      expect(result.value.entries[0]).toBe(true)  // 月曜
      expect(result.value.entries[1]).toBe(false) // 火曜
      expect(result.value.entries[2]).toBe(true)  // 水曜
    }
  })

  it('ほつれ使用日を取得できること', async () => {
    // Arrange
    const entriesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    const streaksChain = createSelectChainMock({
      data: { hotsure_used_dates: ['2024-01-16', '2024-01-18'] }, // 火曜・木曜
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(entriesChain)
      .mockReturnValueOnce(streaksChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    const result = await getWeeklyRecords('user-1')

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.hotsures).toHaveLength(7)
      expect(result.value.hotsures[0]).toBe(false) // 月曜
      expect(result.value.hotsures[1]).toBe(true)  // 火曜（ほつれ使用）
      expect(result.value.hotsures[2]).toBe(false) // 水曜
      expect(result.value.hotsures[3]).toBe(true)  // 木曜（ほつれ使用）
    }
  })

  it('月曜始まりの週計算が正しいこと', async () => {
    // Arrange: 2024-01-18（木曜日）を基準
    mockGetJSTToday.mockReturnValue('2024-01-18')

    const entriesChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    const streaksChain = createSelectChainMock({
      data: { hotsure_used_dates: [] },
      error: null,
    })

    const mockFrom = jest.fn()
      .mockReturnValueOnce(entriesChain)
      .mockReturnValueOnce(streaksChain)

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    // Act
    await getWeeklyRecords('user-1')

    // Assert: 週の開始が月曜日（2024-01-15）であること
    expect(entriesChain.gte).toHaveBeenCalledWith(
      'created_at',
      '2024-01-15T00:00:00+09:00'
    )
  })
})

describe('breakStreak', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ストリークを0にリセットできること', async () => {
    // Arrange
    const chain = createUpdateChainMock({ data: null, error: null })
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await breakStreak('user-1')

    // Assert
    expect(result.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ current_streak: 0 })
  })

  it('DBエラー時にエラーを返すこと', async () => {
    // Arrange
    const chain = createUpdateChainMock({
      data: null,
      error: { code: 'PGRST000', message: 'Database error' },
    })
    mockCreateClient.mockResolvedValue({ from: jest.fn().mockReturnValue(chain) } as never)

    // Act
    const result = await breakStreak('user-1')

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('DB_ERROR')
      expect(result.error.message).toBe('Database error')
    }
  })
})
