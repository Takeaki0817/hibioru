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
} from '../api/daily-limits'
import { createClient } from '@/lib/supabase/server'

// モック設定
jest.mock('@/lib/supabase/server')
const mockCreateClient = jest.mocked(createClient)

describe('daily-limits', () => {
  const mockUserId = 'test-user-123'

  // チェーンモックを作成するヘルパー関数
  const createChainMock = (finalResult: { count: number | null; error: unknown }) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockResolvedValue(finalResult),
      not: jest.fn().mockReturnThis(),
    }
    return {
      from: jest.fn().mockReturnValue(chain),
      auth: { getUser: jest.fn() }
    }
  }

  beforeEach(() => {
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
      const mockClient = createChainMock({ count: 5, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

      const count = await getDailyEntryCount(mockUserId)
      expect(count).toBe(5)
    })

    it('エラー時は0を返すこと', async () => {
      const mockClient = createChainMock({ count: null, error: { message: 'DB error' } })
      mockCreateClient.mockResolvedValue(mockClient)

      const count = await getDailyEntryCount(mockUserId)
      expect(count).toBe(0)
    })
  })

  describe('getDailyImageCount', () => {
    it('当日の画像投稿件数を取得できること', async () => {
      const mockClient = createChainMock({ count: 3, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

      const count = await getDailyImageCount(mockUserId)
      expect(count).toBe(3)
    })
  })

  describe('checkDailyEntryLimit', () => {
    it('制限内の場合はallowed=trueを返すこと', async () => {
      const mockClient = createChainMock({ count: 5, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

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
      const mockClient = createChainMock({ count: 20, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

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
      const mockClient = createChainMock({ count: 2, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

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
      const mockClient = createChainMock({ count: 5, error: null })
      mockCreateClient.mockResolvedValue(mockClient)

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
