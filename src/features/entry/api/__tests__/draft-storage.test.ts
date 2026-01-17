import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { saveDraft, loadDraft, clearDraft } from '../draft-storage'
import type { Draft } from '../../types'

describe('entry/api/draft-storage.ts', () => {
  const DRAFT_STORAGE_KEY = 'hibioru_entry_draft'

  beforeEach(() => {
    // ローカルストレージをリセット
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('saveDraft', () => {
    it('正常系: DraftオブジェクトをlocalStorageに保存', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト投稿',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }

      // Act
      saveDraft(draft)

      // Assert
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed).toEqual(draft)
    })

    it('正常系: 画像プレビュー付きで保存', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト投稿',
        imagePreview: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        savedAt: new Date().toISOString(),
      }

      // Act
      saveDraft(draft)

      // Assert
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.imagePreview).toContain('data:image/jpeg;base64')
    })

    it('SSR対応: サーバー側で実行された場合（typeof window === undefined）は処理しない', () => {
      // Arrange
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      const draft: Draft = {
        content: 'テスト',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')

      // Act
      saveDraft(draft)

      // Assert
      expect(setItemSpy).not.toHaveBeenCalled()

      // Cleanup
      global.window = originalWindow
      setItemSpy.mockRestore()
    })

    it('ストレージ満杯時: QuotaExceededErrorを無視', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      // Act & Assert: 例外が発生しない
      expect(() => {
        saveDraft(draft)
      }).not.toThrow()

      setItemSpy.mockRestore()
    })
  })

  describe('loadDraft', () => {
    it('正常系: localStorageからDraftを復元', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト投稿',
        imagePreview: null,
        savedAt: '2026-01-17T10:00:00Z',
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))

      // Act
      const loaded = loadDraft()

      // Assert
      expect(loaded).toEqual(draft)
    })

    it('正常系: 画像プレビュー付きで復元', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト投稿',
        imagePreview: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        savedAt: '2026-01-17T10:00:00Z',
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))

      // Act
      const loaded = loadDraft()

      // Assert
      expect(loaded?.imagePreview).toContain('data:image/jpeg;base64')
    })

    it('nullを返す: キーが存在しない', () => {
      // Arrange
      // ストレージには何も保存しない

      // Act
      const loaded = loadDraft()

      // Assert
      expect(loaded).toBeNull()
    })

    it('SSR対応: サーバー側で実行された場合（typeof window === undefined）はnullを返す', () => {
      // Arrange
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toBeNull()
      expect(getItemSpy).not.toHaveBeenCalled()

      // Cleanup
      global.window = originalWindow
      getItemSpy.mockRestore()
    })

    it('nullを返す: JSON.parseエラーが発生した場合（破損データ）', () => {
      // Arrange
      localStorage.setItem(DRAFT_STORAGE_KEY, 'invalid json {')

      // Act
      const loaded = loadDraft()

      // Assert
      expect(loaded).toBeNull()
    })
  })

  describe('clearDraft', () => {
    it('正常系: localStorageからキーを削除', () => {
      // Arrange
      const draft: Draft = {
        content: 'テスト',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull()

      // Act
      clearDraft()

      // Assert
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    })

    it('SSR対応: サーバー側で実行された場合（typeof window === undefined）は処理しない', () => {
      // Arrange
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem')

      // Act
      clearDraft()

      // Assert
      expect(removeItemSpy).not.toHaveBeenCalled()

      // Cleanup
      global.window = originalWindow
      removeItemSpy.mockRestore()
    })

    it('ストレージエラー時: 例外を無視', () => {
      // Arrange
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      // Act & Assert: 例外が発生しない
      expect(() => {
        clearDraft()
      }).not.toThrow()

      removeItemSpy.mockRestore()
    })
  })

  describe('統合テスト', () => {
    it('保存→読み込み→削除の一連の流れ', () => {
      // Arrange
      const draft: Draft = {
        content: '統合テスト用の投稿',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }

      // Act & Assert: 保存
      saveDraft(draft)
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull()

      // Act & Assert: 読み込み
      const loaded = loadDraft()
      expect(loaded).toEqual(draft)

      // Act & Assert: 削除
      clearDraft()
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()

      // Act & Assert: 削除後に読み込むとnull
      expect(loadDraft()).toBeNull()
    })

    it('複数回の保存で最新のデータが上書きされる', () => {
      // Arrange
      const draft1: Draft = {
        content: '最初の投稿',
        imagePreview: null,
        savedAt: '2026-01-17T10:00:00Z',
      }
      const draft2: Draft = {
        content: '更新後の投稿',
        imagePreview: null,
        savedAt: '2026-01-17T10:01:00Z',
      }

      // Act
      saveDraft(draft1)
      const loaded1 = loadDraft()
      saveDraft(draft2)
      const loaded2 = loadDraft()

      // Assert
      expect(loaded1?.content).toBe('最初の投稿')
      expect(loaded2?.content).toBe('更新後の投稿')
    })
  })
})
