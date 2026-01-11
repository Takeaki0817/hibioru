/**
 * draft-storage のテスト
 * @jest-environment jsdom
 */

import { saveDraft, loadDraft, clearDraft } from '../draft-storage'
import type { Draft } from '../../types'

describe('draft-storage', () => {
  // テスト用の下書きデータ
  const mockDraft: Draft = {
    content: 'テスト投稿内容',
    imagePreview: 'data:image/png;base64,abc123',
    savedAt: '2025-01-12T10:00:00.000Z',
  }

  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('saveDraft', () => {
    it('下書きを正しく保存できること', () => {
      // Arrange
      const spy = jest.spyOn(Storage.prototype, 'setItem')

      // Act
      saveDraft(mockDraft)

      // Assert
      expect(spy).toHaveBeenCalledWith(
        'hibioru_entry_draft',
        JSON.stringify(mockDraft)
      )
      spy.mockRestore()
    })

    it('保存した下書きをloadDraftで読み込めること', () => {
      // Arrange & Act
      saveDraft(mockDraft)
      const loaded = loadDraft()

      // Assert
      expect(loaded).toEqual(mockDraft)
    })

    it('localStorage例外時は無視すること', () => {
      // Arrange: setItemが例外を投げるようモック
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      // Act & Assert: 例外が外に伝播しないこと
      expect(() => saveDraft(mockDraft)).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('loadDraft', () => {
    it('保存済み下書きを読み込めること', () => {
      // Arrange
      localStorage.setItem('hibioru_entry_draft', JSON.stringify(mockDraft))

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toEqual(mockDraft)
    })

    it('未保存時はnullを返すこと', () => {
      // Arrange: 何も保存しない

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toBeNull()
    })

    it('不正なJSONの場合はnullを返すこと', () => {
      // Arrange: 不正なJSONを保存
      localStorage.setItem('hibioru_entry_draft', 'not valid json {{{')

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toBeNull()
    })

    it('localStorage例外時はnullを返すこと', () => {
      // Arrange: getItemが例外を投げるようモック
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toBeNull()
      spy.mockRestore()
    })
  })

  describe('clearDraft', () => {
    it('下書きを削除できること', () => {
      // Arrange: 下書きを保存
      localStorage.setItem('hibioru_entry_draft', JSON.stringify(mockDraft))

      // Act
      clearDraft()

      // Assert
      expect(localStorage.getItem('hibioru_entry_draft')).toBeNull()
    })

    it('下書きがない状態で削除しても問題ないこと', () => {
      // Arrange: 何も保存しない

      // Act & Assert: 例外が発生しないこと
      expect(() => clearDraft()).not.toThrow()
    })

    it('localStorage例外時は無視すること', () => {
      // Arrange: removeItemが例外を投げるようモック
      const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      // Act & Assert: 例外が外に伝播しないこと
      expect(() => clearDraft()).not.toThrow()
      spy.mockRestore()
    })
  })
})

/**
 * SSR環境（window === undefined）のテスト
 *
 * 注: jsdom環境ではwindowを完全に削除することが困難なため、
 * ソースコードの `typeof window === 'undefined'` チェックが
 * 正しく実装されていることはコードレビューで確認済み。
 *
 * 以下のテストでは、関数がエラーなく動作することを確認する。
 * 実際のSSR環境での動作はE2Eテストまたは統合テストで検証。
 */
describe('draft-storage SSR環境シミュレーション', () => {
  describe('saveDraft', () => {
    it('localStorageが使用できない場合でもエラーにならないこと', () => {
      // Arrange: localStorageアクセスを完全に失敗させる
      const mockDraft: Draft = {
        content: 'テスト',
        imagePreview: null,
        savedAt: new Date().toISOString(),
      }

      // setItemが例外を投げるようモック（SSR環境相当）
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new ReferenceError('localStorage is not defined')
      })

      // Act & Assert: 例外が外に伝播しないこと
      expect(() => saveDraft(mockDraft)).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('loadDraft', () => {
    it('localStorageが使用できない場合はnullを返すこと', () => {
      // Arrange: getItemが例外を投げるようモック（SSR環境相当）
      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new ReferenceError('localStorage is not defined')
      })

      // Act
      const result = loadDraft()

      // Assert
      expect(result).toBeNull()
      spy.mockRestore()
    })
  })

  describe('clearDraft', () => {
    it('localStorageが使用できない場合でもエラーにならないこと', () => {
      // Arrange: removeItemが例外を投げるようモック（SSR環境相当）
      const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new ReferenceError('localStorage is not defined')
      })

      // Act & Assert: 例外が外に伝播しないこと
      expect(() => clearDraft()).not.toThrow()
      spy.mockRestore()
    })
  })
})
