/**
 * ほつれサービスのテスト
 * @jest-environment node
 */

import {
  getHotsureInfo,
  canUseHotsure,
  consumeHotsure,
  resetHotsureWeekly,
} from '../service'
import { createClient } from '@/lib/supabase/server'

// モック設定
jest.mock('@/lib/supabase/server')
const mockCreateClient = jest.mocked(createClient)

describe('hotsure service', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
    // Date.nowをモックして「今日」を固定
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T12:00:00+09:00'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // streaksテーブルへのselectクエリをモックするヘルパー
  const createSelectMock = (result: {
    data: { hotsure_remaining: number; hotsure_used_dates: string[] } | null
    error: { message: string } | null
  }) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
    }
    return {
      from: jest.fn().mockReturnValue(chain),
      auth: { getUser: jest.fn() },
      rpc: jest.fn(),
    }
  }

  // RPC呼び出しをモックするヘルパー
  const createRpcMock = (result: {
    data: Record<string, unknown> | null
    error: { message: string } | null
  }) => {
    return {
      from: jest.fn(),
      auth: { getUser: jest.fn() },
      rpc: jest.fn().mockResolvedValue(result),
    }
  }

  describe('getHotsureInfo', () => {
    it('ほつれ情報を正常に取得できること', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: {
          hotsure_remaining: 2,
          hotsure_used_dates: ['2024-01-10', '2024-01-12'],
        },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await getHotsureInfo(mockUserId)

      // Assert
      expect(result).toEqual({
        remaining: 2,
        usedDates: ['2024-01-10', '2024-01-12'],
        maxPerWeek: 2,
      })
      expect(mockClient.from).toHaveBeenCalledWith('streaks')
    })

    it('レコードが存在しない場合はnullを返すこと', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: null,
        error: { message: 'No rows found' },
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await getHotsureInfo(mockUserId)

      // Assert
      expect(result).toBeNull()
    })

    it('maxPerWeekが2であること', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: {
          hotsure_remaining: 1,
          hotsure_used_dates: [],
        },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await getHotsureInfo(mockUserId)

      // Assert
      expect(result?.maxPerWeek).toBe(2)
    })
  })

  describe('canUseHotsure', () => {
    it('残り回数が1以上でtrueを返すこと', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: {
          hotsure_remaining: 1,
          hotsure_used_dates: [],
        },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await canUseHotsure(mockUserId)

      // Assert
      expect(result).toBe(true)
    })

    it('残り回数が0でfalseを返すこと', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: {
          hotsure_remaining: 0,
          hotsure_used_dates: [],
        },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await canUseHotsure(mockUserId)

      // Assert
      expect(result).toBe(false)
    })

    it('今日既に使用済みの場合はfalseを返すこと', async () => {
      // Arrange: 今日の日付（2024-01-15）が使用済み
      const mockClient = createSelectMock({
        data: {
          hotsure_remaining: 1,
          hotsure_used_dates: ['2024-01-15'],
        },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await canUseHotsure(mockUserId)

      // Assert
      expect(result).toBe(false)
    })

    it('レコードが存在しない場合はfalseを返すこと', async () => {
      // Arrange
      const mockClient = createSelectMock({
        data: null,
        error: { message: 'No rows found' },
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await canUseHotsure(mockUserId)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('consumeHotsure', () => {
    it('ほつれを正常に消費できること', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: { success: true, remaining: 1 },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await consumeHotsure(mockUserId)

      // Assert
      expect(result).toEqual({
        success: true,
        remaining: 1,
      })
      expect(mockClient.rpc).toHaveBeenCalledWith('consume_hotsure', {
        p_user_id: mockUserId,
      })
    })

    it('残り回数が0の場合は失敗すること', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: { success: false, error: 'No hotsure remaining' },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await consumeHotsure(mockUserId)

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'No hotsure remaining',
      })
    })

    it('RPC呼び出し失敗時にエラーを返すこと', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: null,
        error: { message: 'Database connection error' },
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await consumeHotsure(mockUserId)

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Database connection error',
      })
    })

    it('同時実行防止のためにFOR UPDATE付きRPCを呼び出すこと', async () => {
      // Arrange: RPCが呼ばれることを確認（FOR UPDATEはRPC内で実装）
      const mockClient = createRpcMock({
        data: { success: true, remaining: 1 },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      await consumeHotsure(mockUserId)

      // Assert: consume_hotsure RPCが呼ばれることを確認
      // FOR UPDATEはRPC関数内で実装されているため、RPCが呼ばれることで間接的に確認
      expect(mockClient.rpc).toHaveBeenCalledWith('consume_hotsure', {
        p_user_id: mockUserId,
      })
    })
  })

  describe('resetHotsureWeekly', () => {
    it('全ユーザーのほつれをリセットできること', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: { success: true, affected_users: 100 },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result).toEqual({
        success: true,
        affectedUsers: 100,
      })
      expect(mockClient.rpc).toHaveBeenCalledWith('reset_hotsure_weekly')
    })

    it('使用履歴がクリアされること', async () => {
      // Arrange: RPC関数が使用履歴もクリアする想定
      // 実際のクリア処理はRPC内で行われるため、呼び出しを確認
      const mockClient = createRpcMock({
        data: { success: true, affected_users: 50 },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result.success).toBe(true)
      expect(mockClient.rpc).toHaveBeenCalledWith('reset_hotsure_weekly')
    })

    it('影響を受けたユーザー数を返すこと', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: { success: true, affected_users: 250 },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result.affectedUsers).toBe(250)
    })

    it('RPC失敗時にエラーを返すこと', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: null,
        error: { message: 'Permission denied' },
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Permission denied',
      })
    })

    it('RPC内部エラー時にエラーを返すこと', async () => {
      // Arrange
      const mockClient = createRpcMock({
        data: { success: false, error: 'Internal error' },
        error: null,
      })
      mockCreateClient.mockResolvedValue(mockClient)

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Internal error',
      })
    })
  })
})
