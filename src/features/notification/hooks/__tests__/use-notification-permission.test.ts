/**
 * @jest-environment jsdom
 */

/**
 * useNotificationPermission フックのテスト
 *
 * テストアプローチ:
 * このフックはブラウザのNotification APIに依存しており、useSyncExternalStoreを使用している。
 * jsdom環境でNotification APIを適切にモックし、権限状態と権限リクエストをテストする。
 *
 * 注意点:
 * - useSyncExternalStoreはモジュールレベルの関数を参照するため、
 *   テスト間でNotification.permissionを変更しても即座に反映されない場合がある
 * - より複雑な統合テストはE2Eで実施することを推奨
 */

import { renderHook, act } from '@testing-library/react'
import { useNotificationPermission } from '../use-notification-permission'

// Notification APIのモック
const mockRequestPermission = jest.fn()

// テスト間で共有されるNotificationのモック
const createNotificationMock = (permission: NotificationPermission) => ({
  permission,
  requestPermission: mockRequestPermission,
})

describe('useNotificationPermission', () => {
  const originalNotification = window.Notification

  beforeEach(() => {
    jest.clearAllMocks()
    // デフォルトのモック設定
    mockRequestPermission.mockResolvedValue('granted')
    Object.defineProperty(window, 'Notification', {
      value: createNotificationMock('default'),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Notificationを元に戻す
    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      writable: true,
      configurable: true,
    })
  })

  describe('サポート検出', () => {
    it('Notification APIをサポートしている場合', () => {
      // Arrange - Notification APIが存在する

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.isSupported).toBe(true)
    })

    it('Notification APIをサポートしていない場合', () => {
      // Arrange - Notification APIを削除
      // @ts-expect-error - テスト用にNotificationを削除
      delete window.Notification

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('初期権限状態', () => {
    it('初期権限が"default"の場合', () => {
      // Arrange
      Object.defineProperty(window, 'Notification', {
        value: createNotificationMock('default'),
        writable: true,
        configurable: true,
      })

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('default')
    })

    it('初期権限が"granted"の場合', () => {
      // Arrange
      Object.defineProperty(window, 'Notification', {
        value: createNotificationMock('granted'),
        writable: true,
        configurable: true,
      })

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('granted')
    })

    it('初期権限が"denied"の場合', () => {
      // Arrange
      Object.defineProperty(window, 'Notification', {
        value: createNotificationMock('denied'),
        writable: true,
        configurable: true,
      })

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('denied')
    })
  })

  describe('権限リクエスト', () => {
    it('権限リクエスト成功 (granted)', async () => {
      // Arrange
      mockRequestPermission.mockResolvedValue('granted')

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      let permission: NotificationPermission = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      // Assert
      expect(permission).toBe('granted')
      expect(result.current.permission).toBe('granted')
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    it('権限リクエスト拒否 (denied)', async () => {
      // Arrange
      mockRequestPermission.mockResolvedValue('denied')

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      let permission: NotificationPermission = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      // Assert
      expect(permission).toBe('denied')
      expect(result.current.permission).toBe('denied')
    })

    it('サポートなしでリクエストした場合は"denied"を返す', async () => {
      // Arrange - Notification APIを削除
      // @ts-expect-error - テスト用にNotificationを削除
      delete window.Notification

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      let permission: NotificationPermission = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      // Assert
      expect(permission).toBe('denied')
      expect(result.current.isSupported).toBe(false)
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })
  })

  describe('戻り値の構造', () => {
    it('必要なプロパティを全て返す', () => {
      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current).toHaveProperty('isSupported')
      expect(result.current).toHaveProperty('permission')
      expect(result.current).toHaveProperty('requestPermission')
      expect(typeof result.current.isSupported).toBe('boolean')
      expect(typeof result.current.permission).toBe('string')
      expect(typeof result.current.requestPermission).toBe('function')
    })
  })

  describe('requestPermissionの型', () => {
    it('requestPermissionはPromiseを返す', async () => {
      // Act
      const { result } = renderHook(() => useNotificationPermission())
      const returnValue = result.current.requestPermission()

      // Assert
      expect(returnValue).toBeInstanceOf(Promise)

      // クリーンアップ
      await act(async () => {
        await returnValue
      })
    })
  })
})
