/**
 * 日次制限チェック機能のテスト
 * @jest-environment node
 */

import {
  getDailyEntryCount,
  getDailyImageCount,
  checkDailyEntryLimit,
  checkDailyImageLimit,
  DAILY_ENTRY_LIMIT,
  DAILY_IMAGE_LIMIT
} from './daily-limits'

// モック設定
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('daily-limits', () => {
  const mockUserId = 'test-user-123'
  let mockSupabaseClient: {
    from: jest.Mock
    auth: { getUser: jest.Mock }
  }

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(),
      auth: { getUser: jest.fn() }
    }

    const { createClient } = require('@/lib/supabase/server')
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('定数の確認', () => {
    it('投稿上限は20件であること', () => {
      expect(DAILY_ENTRY_LIMIT).toBe(20)
    })

    it('画像上限は5枚であること', () => {
      expect(DAILY_IMAGE_LIMIT).toBe(5)
    })
  })

  describe('getDailyEntryCount', () => {
    it('当日の投稿件数を取得できること', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockReturnValue({
              count: 5,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const count = await getDailyEntryCount(mockUserId)
      expect(count).toBe(5)
    })

    it('エラー時は0を返すこと', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockReturnValue({
              count: null,
              error: { message: 'DB error' }
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const count = await getDailyEntryCount(mockUserId)
      expect(count).toBe(0)
    })
  })

  describe('getDailyImageCount', () => {
    it('当日の画像投稿件数を取得できること', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                count: 3,
                error: null
              })
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const count = await getDailyImageCount(mockUserId)
      expect(count).toBe(3)
    })
  })

  describe('checkDailyEntryLimit', () => {
    it('制限内の場合はallowed=trueを返すこと', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              count: 5,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await checkDailyEntryLimit(mockUserId)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(5)
        expect(result.value.limit).toBe(20)
        expect(result.value.remaining).toBe(15)
      }
    })

    it('上限到達時はallowed=falseを返すこと', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              count: 20,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await checkDailyEntryLimit(mockUserId)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(false)
        expect(result.value.current).toBe(20)
        expect(result.value.remaining).toBe(0)
      }
    })
  })

  describe('checkDailyImageLimit', () => {
    it('制限内の場合はallowed=trueを返すこと', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                count: 2,
                error: null
              })
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await checkDailyImageLimit(mockUserId)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.current).toBe(2)
        expect(result.value.limit).toBe(5)
        expect(result.value.remaining).toBe(3)
      }
    })

    it('上限到達時はallowed=falseを返すこと', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                count: 5,
                error: null
              })
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const result = await checkDailyImageLimit(mockUserId)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.allowed).toBe(false)
        expect(result.value.current).toBe(5)
        expect(result.value.remaining).toBe(0)
      }
    })
  })
})
