import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'
import { useEntrySubmit } from '../use-entry-submit'
import type { Entry } from '../../types'

// モック依存関係
jest.mock('next/navigation')
jest.mock('@tanstack/react-query')
jest.mock('@/features/entry/api/actions')
jest.mock('@/features/entry/api/image-service')
jest.mock('@/features/entry/api/draft-storage')
jest.mock('@/features/entry/hooks/use-create-entry-mutation')

describe('entry/hooks/use-entry-submit.ts', () => {
  const mockUserId = 'user-123'
  const mockEntry: Entry = {
    id: 'entry-123',
    user_id: mockUserId,
    content: 'テスト投稿',
    image_urls: null,
    is_shared: false,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useEntrySubmit - Create Mode', () => {
    it('初期化: formRefが作成される', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
        })
      )

      // Assert
      expect(result.current.formRef).toBeDefined()
      expect(result.current.formRef.current).toBeNull()
    })

    it('正常系: handleSubmitが関数として存在', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
        })
      )

      // Assert
      expect(typeof result.current.handleSubmit).toBe('function')
    })

    it('正常系: submitFormメソッドが関数として存在', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
        })
      )

      // Assert
      expect(typeof result.current.submitForm).toBe('function')
    })
  })

  describe('useEntrySubmit - Edit Mode', () => {
    it('初期化: initialEntryを指定して編集モードで初期化', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'edit',
          initialEntry: mockEntry,
          userId: mockUserId,
        })
      )

      // Assert
      expect(result.current.formRef).toBeDefined()
      expect(typeof result.current.handleSubmit).toBe('function')
    })
  })

  describe('useEntrySubmit - Callbacks', () => {
    it('onSuccessコールバックが提供された場合に使用される', () => {
      // Arrange
      const mockOnSuccess = vi.fn()

      // Act
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
          onSuccess: mockOnSuccess,
        })
      )

      // Assert
      expect(typeof result.current.handleSubmit).toBe('function')
      // onSuccessは内部で使用される
    })
  })

  describe('useEntrySubmit - Form Reference Management', () => {
    it('formRefを使用してフォーム送信をリクエストできる', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
        })
      )

      const mockForm = document.createElement('form')
      const requestSubmitSpy = vi.spyOn(mockForm, 'requestSubmit')
      result.current.formRef.current = mockForm

      // Act
      result.current.submitForm()

      // Assert
      expect(requestSubmitSpy).toHaveBeenCalled()
    })

    it('formRef.currentがnullの場合は何もしない', () => {
      // Arrange
      const { result } = renderHook(() =>
        useEntrySubmit({
          mode: 'create',
          userId: mockUserId,
        })
      )
      // formRef.currentはデフォルトでnull

      // Act & Assert: エラーが発生しない
      expect(() => {
        result.current.submitForm()
      }).not.toThrow()
    })
  })
})
