/**
 * EntryFormStore ユニットテスト
 * @jest-environment node
 */

import { useEntryFormStore, selectCanSubmit } from '../entry-form-store'

describe('entry-form-store', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useEntryFormStore.getState().reset()
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されていること', () => {
      const state = useEntryFormStore.getState()

      expect(state.content).toBe('')
      expect(state.images).toEqual([])
      expect(state.existingImageUrls).toEqual([])
      expect(state.removedImageUrls).toEqual([])
      expect(state.isSubmitting).toBe(false)
      expect(state.isDeleting).toBe(false)
      expect(state.showDeleteConfirm).toBe(false)
      expect(state.isSuccess).toBe(false)
      expect(state.isFocused).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('フォーム操作', () => {
    it('setContentでコンテンツを設定できること', () => {
      useEntryFormStore.getState().setContent('テスト投稿')
      expect(useEntryFormStore.getState().content).toBe('テスト投稿')
    })

    it('addImageで画像を追加できること', () => {
      const mockImage = {
        file: new Blob(['test']) as unknown as File,
        previewUrl: 'blob:test-url',
        originalSize: 1000,
        compressedSize: 500,
      }
      useEntryFormStore.getState().addImage(mockImage)
      expect(useEntryFormStore.getState().images).toEqual([mockImage])
    })

    it('removeImageで画像を削除できること', () => {
      const mockImage = {
        file: new Blob(['test']) as unknown as File,
        previewUrl: 'blob:test-url',
        originalSize: 1000,
        compressedSize: 500,
      }
      useEntryFormStore.getState().addImage(mockImage)
      useEntryFormStore.getState().removeImage(0)
      expect(useEntryFormStore.getState().images).toEqual([])
    })
  })

  describe('UI状態', () => {
    it('setSubmittingで送信中状態を設定できること', () => {
      useEntryFormStore.getState().setSubmitting(true)
      expect(useEntryFormStore.getState().isSubmitting).toBe(true)
    })

    it('setDeletingで削除中状態を設定できること', () => {
      useEntryFormStore.getState().setDeleting(true)
      expect(useEntryFormStore.getState().isDeleting).toBe(true)
    })

    it('setShowDeleteConfirmで削除確認ダイアログ状態を設定できること', () => {
      useEntryFormStore.getState().setShowDeleteConfirm(true)
      expect(useEntryFormStore.getState().showDeleteConfirm).toBe(true)
    })

    it('setSuccessで成功状態を設定できること', () => {
      useEntryFormStore.getState().setSuccess(true)
      expect(useEntryFormStore.getState().isSuccess).toBe(true)
    })

    it('setFocusedでフォーカス状態を設定できること', () => {
      useEntryFormStore.getState().setFocused(true)
      expect(useEntryFormStore.getState().isFocused).toBe(true)
    })

    it('setErrorでエラーを設定できること', () => {
      useEntryFormStore.getState().setError('テストエラー')
      expect(useEntryFormStore.getState().error).toBe('テストエラー')
    })
  })

  describe('複合アクション', () => {
    describe('submitStart', () => {
      it('送信開始時に正しい状態になること', () => {
        useEntryFormStore.getState().setError('既存エラー')
        useEntryFormStore.getState().submitStart()

        const state = useEntryFormStore.getState()
        expect(state.isSubmitting).toBe(true)
        expect(state.error).toBeNull()
      })
    })

    describe('submitSuccess', () => {
      it('送信成功時に正しい状態になること', () => {
        useEntryFormStore.getState().submitStart()
        useEntryFormStore.getState().submitSuccess()

        const state = useEntryFormStore.getState()
        expect(state.isSubmitting).toBe(false)
        expect(state.isSuccess).toBe(true)
      })
    })

    describe('submitError', () => {
      it('送信エラー時に正しい状態になること', () => {
        useEntryFormStore.getState().submitStart()
        useEntryFormStore.getState().submitError('投稿に失敗しました')

        const state = useEntryFormStore.getState()
        expect(state.isSubmitting).toBe(false)
        expect(state.error).toBe('投稿に失敗しました')
      })
    })

    describe('deleteStart', () => {
      it('削除開始時に正しい状態になること', () => {
        useEntryFormStore.getState().setError('既存エラー')
        useEntryFormStore.getState().deleteStart()

        const state = useEntryFormStore.getState()
        expect(state.isDeleting).toBe(true)
        expect(state.error).toBeNull()
      })
    })

    describe('deleteError', () => {
      it('削除エラー時に正しい状態になること', () => {
        useEntryFormStore.getState().setShowDeleteConfirm(true)
        useEntryFormStore.getState().deleteStart()
        useEntryFormStore.getState().deleteError('削除に失敗しました')

        const state = useEntryFormStore.getState()
        expect(state.isDeleting).toBe(false)
        expect(state.error).toBe('削除に失敗しました')
        expect(state.showDeleteConfirm).toBe(false)
      })
    })
  })

  describe('initialize', () => {
    it('空のコンテンツで初期化できること', () => {
      useEntryFormStore.getState().setContent('既存コンテンツ')
      useEntryFormStore.getState().setSubmitting(true)

      useEntryFormStore.getState().initialize()

      const state = useEntryFormStore.getState()
      expect(state.content).toBe('')
      expect(state.isSubmitting).toBe(false)
    })

    it('指定したコンテンツで初期化できること', () => {
      useEntryFormStore.getState().initialize('初期コンテンツ')

      expect(useEntryFormStore.getState().content).toBe('初期コンテンツ')
    })
  })

  describe('reset', () => {
    it('全ての状態を初期値にリセットできること', () => {
      // 状態を変更
      useEntryFormStore.getState().setContent('テスト')
      useEntryFormStore.getState().setSubmitting(true)
      useEntryFormStore.getState().setError('エラー')

      // リセット
      useEntryFormStore.getState().reset()
      const state = useEntryFormStore.getState()

      expect(state.content).toBe('')
      expect(state.isSubmitting).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('selectCanSubmit', () => {
    it('コンテンツがあり、他の処理中でなければtrueを返すこと', () => {
      useEntryFormStore.getState().setContent('投稿内容')
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(true)
    })

    it('コンテンツが空の場合はfalseを返すこと', () => {
      useEntryFormStore.getState().setContent('')
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(false)
    })

    it('コンテンツが空白のみの場合はfalseを返すこと', () => {
      useEntryFormStore.getState().setContent('   ')
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(false)
    })

    it('送信中の場合はfalseを返すこと', () => {
      useEntryFormStore.getState().setContent('投稿内容')
      useEntryFormStore.getState().setSubmitting(true)
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(false)
    })

    it('削除中の場合はfalseを返すこと', () => {
      useEntryFormStore.getState().setContent('投稿内容')
      useEntryFormStore.getState().setDeleting(true)
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(false)
    })

    it('成功状態の場合はfalseを返すこと', () => {
      useEntryFormStore.getState().setContent('投稿内容')
      useEntryFormStore.getState().setSuccess(true)
      expect(selectCanSubmit(useEntryFormStore.getState())).toBe(false)
    })
  })
})
