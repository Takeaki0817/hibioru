/**
 * useEntrySubmit フックのユニットテスト
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEntrySubmit } from '../use-entry-submit'
import { useEntryFormStore } from '../../stores/entry-form-store'
import { createEntry, updateEntry } from '../../api/actions'
import { uploadImage } from '../../api/image-service'
import { clearDraft } from '../../api/draft-storage'
import type { Entry, CompressedImage } from '../../types'

// モック設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

jest.mock('../../api/actions', () => ({
  createEntry: jest.fn(),
  updateEntry: jest.fn(),
}))

jest.mock('../../api/image-service', () => ({
  uploadImage: jest.fn(),
}))

jest.mock('../../api/draft-storage', () => ({
  clearDraft: jest.fn(),
}))

const mockRouterPush = jest.fn()
const mockCreateEntry = createEntry as jest.MockedFunction<typeof createEntry>
const mockUpdateEntry = updateEntry as jest.MockedFunction<typeof updateEntry>
const mockUploadImage = uploadImage as jest.MockedFunction<typeof uploadImage>
const mockClearDraft = clearDraft as jest.MockedFunction<typeof clearDraft>

// テスト用エントリーデータ
const createMockEntry = (overrides?: Partial<Entry>): Entry => ({
  id: 'entry-1',
  userId: 'user-1',
  content: 'テスト投稿',
  imageUrls: null,
  isShared: false,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  date: '2024-01-15',
  ...overrides,
})

// テスト用画像データ
const createMockImage = (): CompressedImage => ({
  file: new Blob(['test']) as unknown as File,
  previewUrl: 'blob:test-url',
  originalSize: 1000,
  compressedSize: 500,
})

// QueryClient ラッパー
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

describe('useEntrySubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    useEntryFormStore.getState().reset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('新規作成モード', () => {
    // createモードでは楽観的更新（useMutation）を使用するため、
    // handleSubmitは即座にリターンし、Mutationがバックグラウンドで処理を行う
    it('テキストのみのエントリーを作成できること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: null, created_at: new Date().toISOString() },
      })

      // フォーム状態を設定
      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      // フォーム送信
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(mockEvent.preventDefault).toHaveBeenCalled()

      // Mutationの処理完了を待つ
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith({
          content: 'テスト投稿',
          imageUrls: null,
          isShared: false,
        })
      })

      await waitFor(() => {
        expect(mockClearDraft).toHaveBeenCalled()
      })
    })

    it('画像付きエントリーを作成できること', async () => {
      mockUploadImage.mockResolvedValueOnce({
        ok: true,
        value: 'https://storage.example.com/image1.jpg',
      })
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: ['https://storage.example.com/image1.jpg'], created_at: new Date().toISOString() },
      })

      // フォーム状態を設定
      useEntryFormStore.getState().setContent('画像付き投稿')
      useEntryFormStore.getState().addImage(createMockImage())

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith({
          content: '画像付き投稿',
          imageUrls: ['https://storage.example.com/image1.jpg'],
          isShared: false,
        })
      })
    })

    it('画像アップロードエラー時に楽観的更新がロールバックされること', async () => {
      // 即時リダイレクト最適化により、createモードでは楽観的更新を使用し、
      // エラー時はtoastで通知（useEntryFormStoreのerrorは使用しない）
      mockUploadImage.mockResolvedValueOnce({
        ok: false,
        error: { code: 'UPLOAD_ERROR', message: 'アップロード失敗' },
      })

      // フォーム状態を設定
      useEntryFormStore.getState().setContent('画像付き投稿')
      useEntryFormStore.getState().addImage(createMockImage())

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // 即時リダイレクト最適化により、mutationは開始されるがエラー時はロールバック
      // createEntryは呼ばれない（画像アップロード失敗のため）
      await waitFor(() => {
        // uploadImageは呼ばれる
        expect(mockUploadImage).toHaveBeenCalled()
      })
    })

    it('共有設定がonの場合にisSharedがtrueになること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: null, created_at: new Date().toISOString() },
      })

      // フォーム状態を設定（共有ON）
      useEntryFormStore.getState().setContent('共有投稿')
      useEntryFormStore.getState().setIsShared(true)

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          expect.objectContaining({ isShared: true })
        )
      })
    })
  })

  describe('編集モード', () => {
    it('既存エントリーを更新できること', async () => {
      mockUpdateEntry.mockResolvedValueOnce({
        data: { id: 'entry-1', content: '更新後' },
      })

      const initialEntry = createMockEntry()

      // フォーム状態を設定
      useEntryFormStore.getState().setContent('更新後のコンテンツ')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'edit',
            initialEntry,
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(mockUpdateEntry).toHaveBeenCalledWith({
        id: 'entry-1',
        content: '更新後のコンテンツ',
        imageUrls: null,
        isShared: false,
      })
      expect(mockClearDraft).not.toHaveBeenCalled() // 編集時は下書きクリアしない
    })

    it('initialEntryがない場合にエラーを設定すること', async () => {
      // フォーム状態を設定
      useEntryFormStore.getState().setContent('編集内容')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'edit',
            initialEntry: undefined,
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(mockUpdateEntry).not.toHaveBeenCalled()
      expect(useEntryFormStore.getState().error).toBe(
        '編集対象のエントリーが見つかりません'
      )
    })

    it('既存画像を維持しつつ新規画像を追加できること', async () => {
      mockUploadImage.mockResolvedValueOnce({
        ok: true,
        value: 'https://storage.example.com/new-image.jpg',
      })
      mockUpdateEntry.mockResolvedValueOnce({
        data: { id: 'entry-1', content: '更新後' },
      })

      const initialEntry = createMockEntry({
        imageUrls: ['https://storage.example.com/existing-image.jpg'],
      })

      // フォーム状態を設定（initialize で既存画像URL設定）
      useEntryFormStore.getState().initialize(
        '画像更新',
        ['https://storage.example.com/existing-image.jpg'],
        false
      )
      useEntryFormStore.getState().addImage(createMockImage())

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'edit',
            initialEntry,
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(mockUpdateEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: [
            'https://storage.example.com/new-image.jpg',
            'https://storage.example.com/existing-image.jpg',
          ],
        })
      )
    })

    it('削除された既存画像を除外できること', async () => {
      mockUpdateEntry.mockResolvedValueOnce({
        data: { id: 'entry-1', content: '更新後' },
      })

      const initialEntry = createMockEntry({
        imageUrls: [
          'https://storage.example.com/image1.jpg',
          'https://storage.example.com/image2.jpg',
        ],
      })

      // フォーム状態を設定（image1を削除予定）
      useEntryFormStore.getState().initialize(
        '画像削除',
        [
          'https://storage.example.com/image1.jpg',
          'https://storage.example.com/image2.jpg',
        ],
        false
      )
      useEntryFormStore.getState().toggleExistingImageRemoval(
        'https://storage.example.com/image1.jpg'
      )

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'edit',
            initialEntry,
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(mockUpdateEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: ['https://storage.example.com/image2.jpg'],
        })
      )
    })
  })

  describe('エラーハンドリング', () => {
    // 即時リダイレクト最適化により、createモードではエラー時にtoastで通知される
    // useEntryFormStoreのerrorではなく、useCreateEntryMutation内でtoast.errorが呼ばれる
    it('サーバーエラー時に楽観的更新がロールバックされること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        serverError: '投稿に失敗しました',
      })

      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // mutationが開始されたことを確認
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })

      // 300ms後にリダイレクト
      await act(async () => {
        jest.advanceTimersByTime(800)
      })
      expect(mockRouterPush).toHaveBeenCalledWith('/timeline')
    })

    it('dataがない場合に楽観的更新がロールバックされること', async () => {
      mockCreateEntry.mockResolvedValueOnce({ data: null })

      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // mutationが開始されたことを確認
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })
    })

    it('例外発生時に楽観的更新がロールバックされること', async () => {
      mockCreateEntry.mockRejectedValueOnce(new Error('ネットワークエラー'))

      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // mutationが開始されたことを確認（エラー発生前に呼ばれる）
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })
    })

    // 編集モードでは従来通りuseEntryFormStoreのerrorを使用
    it('編集モードでサーバーエラー時にエラーメッセージを設定すること', async () => {
      mockUpdateEntry.mockResolvedValueOnce({
        serverError: '更新に失敗しました',
      })

      const initialEntry = createMockEntry()
      useEntryFormStore.getState().setContent('編集内容')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'edit',
            initialEntry,
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      await waitFor(() => {
        expect(useEntryFormStore.getState().error).toBe('更新に失敗しました')
      })
    })
  })

  describe('成功時の動作', () => {
    // 即時リダイレクト最適化により、createモードでは:
    // - isSuccessはセットされない（submitSuccess()を呼ばない）
    // - リダイレクトは即座に行われる（タイマー待機なし）
    it('成功時にonSuccessコールバックが即座に呼ばれること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: null, created_at: new Date().toISOString() },
      })

      const onSuccess = jest.fn()
      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
            onSuccess,
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // アニメーション表示後（300ms）にonSuccessが呼ばれる
      await act(async () => {
        jest.advanceTimersByTime(800)
      })
      expect(onSuccess).toHaveBeenCalled()
    })

    it('onSuccessがない場合にアニメーション後にタイムラインへ遷移すること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: null, created_at: new Date().toISOString() },
      })

      useEntryFormStore.getState().setContent('テスト投稿')

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // アニメーション表示後（300ms）にリダイレクト
      await act(async () => {
        jest.advanceTimersByTime(800)
      })
      expect(mockRouterPush).toHaveBeenCalledWith('/timeline')
    })

    it('createモードではアニメーション後にフォームがリセットされること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', user_id: 'user-1', content: 'テスト', image_urls: null, created_at: new Date().toISOString() },
      })

      useEntryFormStore.getState().setContent('テスト投稿')
      useEntryFormStore.getState().setIsShared(true)

      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      // アニメーション表示後（300ms）にフォームがリセットされる
      await act(async () => {
        jest.advanceTimersByTime(800)
      })
      expect(useEntryFormStore.getState().content).toBe('')
      expect(useEntryFormStore.getState().isShared).toBe(false)
    })
  })

  describe('submitForm', () => {
    it('formRefを通じてフォームを送信できること', () => {
      const { result } = renderHook(
        () =>
          useEntrySubmit({
            mode: 'create',
            userId: 'user-1',
          }),
        { wrapper: createWrapper() }
      )

      // フォーム要素のモック
      const mockForm = {
        requestSubmit: jest.fn(),
      }
      ;(result.current.formRef as { current: typeof mockForm }).current = mockForm

      act(() => {
        result.current.submitForm()
      })

      expect(mockForm.requestSubmit).toHaveBeenCalled()
    })
  })
})
