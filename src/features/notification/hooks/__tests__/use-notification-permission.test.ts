import { renderHook, act } from '@testing-library/react'
import { useNotificationPermission } from '../use-notification-permission'

describe('useNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // ブラウザAPIをモック
    Object.defineProperty(global, 'window', {
      value: {
        Notification: {
          permission: 'default',
          requestPermission: jest.fn(),
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('サポート検出', () => {
    it('Notification APIをサポートしている場合', () => {
      // Arrange
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: jest.fn(),
        },
      } as any

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.isSupported).toBe(true)
    })

    it('Notification APIをサポートしていない場合', () => {
      // Arrange
      global.window = {} as any

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.isSupported).toBe(false)
    })

    it('SSR環境での安全性 (window未定義)', () => {
      // Arrange
      delete (global as any).window

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.isSupported).toBe(false)
      expect(result.current.permission).toBe('default')
    })
  })

  describe('初期権限状態', () => {
    it('初期権限が"default"', () => {
      // Arrange
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: jest.fn(),
        },
      } as any

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('default')
    })

    it('初期権限が"granted"', () => {
      // Arrange
      global.window = {
        Notification: {
          permission: 'granted',
          requestPermission: jest.fn(),
        },
      } as any

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('granted')
    })

    it('初期権限が"denied"', () => {
      // Arrange
      global.window = {
        Notification: {
          permission: 'denied',
          requestPermission: jest.fn(),
        },
      } as any

      // Act
      const { result } = renderHook(() => useNotificationPermission())

      // Assert
      expect(result.current.permission).toBe('denied')
    })
  })

  describe('権限リクエスト', () => {
    it('権限リクエスト成功 (granted)', async () => {
      // Arrange
      const mockRequestPermission = jest.fn().mockResolvedValue('granted')
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      } as any

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('granted')
      })

      // Assert
      expect(result.current.permission).toBe('granted')
      expect(mockRequestPermission).toHaveBeenCalled()
    })

    it('権限リクエスト拒否 (denied)', async () => {
      // Arrange
      const mockRequestPermission = jest.fn().mockResolvedValue('denied')
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      } as any

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('denied')
      })

      // Assert
      expect(result.current.permission).toBe('denied')
    })

    it('サポートなしでリクエストした場合は"denied"を返す', async () => {
      // Arrange
      global.window = {} as any

      const { result } = renderHook(() => useNotificationPermission())

      // Act
      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('denied')
      })

      // Assert
      expect(result.current.isSupported).toBe(false)
    })

    it('複数回のリクエストが可能', async () => {
      // Arrange
      const mockRequestPermission = vi
        .fn()
        .mockResolvedValueOnce('default')
        .mockResolvedValueOnce('granted')

      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      } as any

      const { result } = renderHook(() => useNotificationPermission())

      // Act & Assert
      await act(async () => {
        let permission = await result.current.requestPermission()
        expect(permission).toBe('default')
        expect(result.current.permission).toBe('default')

        permission = await result.current.requestPermission()
        expect(permission).toBe('granted')
        expect(result.current.permission).toBe('granted')
      })

      expect(mockRequestPermission).toHaveBeenCalledTimes(2)
    })
  })

  describe('戻り値の構造', () => {
    it('必要なプロパティを全て返す', () => {
      // Arrange
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: jest.fn(),
        },
      } as any

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
      // Arrange
      const mockRequestPermission = jest.fn().mockResolvedValue('granted')
      global.window = {
        Notification: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
      } as any

      const { result } = renderHook(() => useNotificationPermission())

      // Act & Assert
      const returnValue = result.current.requestPermission()
      expect(returnValue).toBeInstanceOf(Promise)

      await act(async () => {
        const permission = await returnValue
        expect(typeof permission).toBe('string')
      })
    })
  })
})
