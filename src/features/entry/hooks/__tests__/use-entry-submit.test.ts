/**
 * useEntrySubmit フックのユニットテスト
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, act } from '@testing-library/react'
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
    useEntryFormStore.getState().reset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('新規作成モード', () => {
    it('テキストのみのエントリーを作成できること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', content: 'テスト' },
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
      expect(mockCreateEntry).toHaveBeenCalledWith({
        content: 'テスト投稿',
        imageUrls: null,
        isShared: false,
      })
      expect(mockClearDraft).toHaveBeenCalled()
    })

    it('画像付きエントリーを作成できること', async () => {
      mockUploadImage.mockResolvedValueOnce({
        ok: true,
        value: 'https://storage.example.com/image1.jpg',
      })
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', content: 'テスト' },
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

      expect(mockUploadImage).toHaveBeenCalled()
      expect(mockCreateEntry).toHaveBeenCalledWith({
        content: '画像付き投稿',
        imageUrls: ['https://storage.example.com/image1.jpg'],
        isShared: false,
      })
    })

    it('画像アップロードエラー時に処理を中断すること', async () => {
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

      expect(mockCreateEntry).not.toHaveBeenCalled()
      expect(useEntryFormStore.getState().error).toBe('アップロード失敗')
    })

    it('共有設定がonの場合にisSharedがtrueになること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', content: 'テスト' },
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

      expect(mockCreateEntry).toHaveBeenCalledWith(
        expect.objectContaining({ isShared: true })
      )
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
    it('サーバーエラー時にエラーメッセージを設定すること', async () => {
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

      expect(useEntryFormStore.getState().error).toBe('投稿に失敗しました')
    })

    it('dataがない場合にエラーメッセージを設定すること', async () => {
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

      expect(useEntryFormStore.getState().error).toBe('エラーが発生しました')
    })

    it('例外発生時にエラーメッセージを設定すること', async () => {
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

      expect(useEntryFormStore.getState().error).toBe('ネットワークエラー')
    })
  })

  describe('成功時の動作', () => {
    it('成功時にonSuccessコールバックが呼ばれること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', content: 'テスト' },
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

      // 成功状態を確認
      expect(useEntryFormStore.getState().isSuccess).toBe(true)

      // タイマーを進める
      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onSuccess).toHaveBeenCalled()
    })

    it('onSuccessがない場合にタイムラインへ遷移すること', async () => {
      mockCreateEntry.mockResolvedValueOnce({
        data: { id: 'new-entry-1', content: 'テスト' },
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

      // タイマーを進める
      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(mockRouterPush).toHaveBeenCalledWith('/timeline')
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
