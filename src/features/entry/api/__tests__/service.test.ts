import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { getEntry } from '../service'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'

describe('entry/api/service.ts', () => {
  const mockSupabase = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  describe('getEntry', () => {
    it('正常系: 存在するエントリを取得', async () => {
      // Arrange
      const entryId = '550e8400-e29b-41d4-a716-446655440000'
      const userId = 'user-123'
      const mockEntry = {
        id: entryId,
        user_id: userId,
        content: 'テストエントリ',
        image_urls: null,
        is_shared: false,
        is_deleted: false,
        created_at: '2026-01-17T10:00:00Z',
        updated_at: '2026-01-17T10:00:00Z',
      }

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({ data: mockEntry, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      // Act
      const result = await getEntry(entryId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value).toEqual(mockEntry)
      expect(mockSupabase.from).toHaveBeenCalledWith('entries')
      expect(mockSelect).toHaveBeenCalledWith()
      expect(mockEq1).toHaveBeenCalledWith('id', entryId)
      expect(mockEq2).toHaveBeenCalledWith('is_deleted', false)
    })

    it('NOT_FOUND: 削除済みのエントリ（is_deleted=true）を取得しようとした場合', async () => {
      // Arrange
      const entryId = '550e8400-e29b-41d4-a716-446655440000'

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      // Act
      const result = await getEntry(entryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toBe('エントリが見つかりません')
    })

    it('NOT_FOUND: 存在しないIDでエントリを取得しようとした場合', async () => {
      // Arrange
      const nonExistentId = 'invalid-id'

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      // Act
      const result = await getEntry(nonExistentId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('DB_ERROR: データベース接続エラーが発生した場合', async () => {
      // Arrange
      const entryId = '550e8400-e29b-41d4-a716-446655440000'

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockRejectedValue(new Error('DB Connection Failed'))

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })

      // Act
      const result = await getEntry(entryId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('DB_ERROR')
      expect(result.error.message).toBe('エントリの取得に失敗しました')
    })
  })
})
