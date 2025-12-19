/**
 * AuthStore ユニットテスト
 * @jest-environment node
 */

import { useAuthStore } from '../auth-store'
import type { User } from '@/lib/types/auth'

describe('auth-store', () => {
  const mockUser: User = {
    id: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  beforeEach(() => {
    // 各テスト前にストアをリセット
    // 注意: resetは isLoading: false, isInitialized: true を設定するため
    // 完全な初期状態に戻すには直接setを使う
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isInitialized: false,
    })
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されていること', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.isInitialized).toBe(false)
    })
  })

  describe('setUser', () => {
    it('ユーザーを設定できること', () => {
      useAuthStore.getState().setUser(mockUser)

      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('ユーザーをnullに設定できること（サインアウト時）', () => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().setUser(null)

      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('ローディング状態を設定できること', () => {
      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)

      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)
    })
  })

  describe('initialize', () => {
    it('ユーザーありで初期化できること', () => {
      useAuthStore.getState().initialize(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('ユーザーなしで初期化できること（未ログイン状態）', () => {
      useAuthStore.getState().initialize(null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('reset', () => {
    it('サインアウト後の状態にリセットできること', () => {
      // ログイン状態を設定
      useAuthStore.getState().initialize(mockUser)

      // リセット（サインアウト）
      useAuthStore.getState().reset()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true) // 初期化済み状態は維持
    })
  })

  describe('認証フロー', () => {
    it('初期化 → ログイン → サインアウトのフローが正しく動作すること', () => {
      // 1. アプリ起動時（未初期化）
      let state = useAuthStore.getState()
      expect(state.isLoading).toBe(true)
      expect(state.isInitialized).toBe(false)

      // 2. セッション確認後、ログイン状態で初期化
      useAuthStore.getState().initialize(mockUser)
      state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)

      // 3. サインアウト
      useAuthStore.getState().reset()
      state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('初期化 → 未ログイン状態のフローが正しく動作すること', () => {
      // 1. アプリ起動時
      let state = useAuthStore.getState()
      expect(state.isLoading).toBe(true)

      // 2. セッション確認後、未ログイン状態で初期化
      useAuthStore.getState().initialize(null)
      state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('認証状態変更時にユーザーを更新できること', () => {
      // 初期化
      useAuthStore.getState().initialize(mockUser)

      // 別のユーザーに切り替え（再ログイン等）
      const anotherUser: User = {
        id: 'another-user-456',
        email: 'another@example.com',
        displayName: 'Another User',
        avatarUrl: null,
      }
      useAuthStore.getState().setUser(anotherUser)

      expect(useAuthStore.getState().user).toEqual(anotherUser)
    })
  })
})
