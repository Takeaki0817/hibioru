/**
 * @jest-environment jsdom
 */

/**
 * バイブレーションフックのテスト
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * - Level 1: 短い振動（100ms）を1回
 * - Level 2: 中程度の振動パターン（100ms振動、50ms休止、100ms振動）
 * - Level 3: 長い振動パターン（100ms振動、50ms休止を3回繰り返し）
 * - 未サポートデバイスでエラーを発生させない
 */
import { renderHook, act } from '@testing-library/react'
import { useVibration, VIBRATION_PATTERNS } from '../use-vibration'

describe('useVibration', () => {
  // navigator.vibrate のモック
  const mockVibrate = jest.fn(() => true)
  const originalNavigator = global.navigator

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('サポート有無の確認', () => {
    it('Vibration APIがサポートされている場合、isSupported=trueを返す', () => {
      Object.defineProperty(global, 'navigator', {
        value: { vibrate: mockVibrate },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useVibration())
      expect(result.current.isSupported).toBe(true)
    })

    it('Vibration APIがサポートされていない場合、isSupported=falseを返す', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useVibration())
      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('レベル別振動パターン', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: { vibrate: mockVibrate },
        writable: true,
        configurable: true,
      })
      // document.visibilityState を visible に設定
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      })
    })

    it('Level 1で短い振動（100ms）が実行される', () => {
      const { result } = renderHook(() => useVibration())

      act(() => {
        result.current.vibrate(1)
      })

      expect(mockVibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS[1])
      expect(mockVibrate).toHaveBeenCalledWith(100)
    })

    it('Level 2で中程度の振動パターン（100-50-100）が実行される', () => {
      const { result } = renderHook(() => useVibration())

      act(() => {
        result.current.vibrate(2)
      })

      expect(mockVibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS[2])
      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100])
    })

    it('Level 3で長い振動パターン（100-50を3回繰り返し）が実行される', () => {
      const { result } = renderHook(() => useVibration())

      act(() => {
        result.current.vibrate(3)
      })

      expect(mockVibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS[3])
      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100, 50, 100, 50])
    })
  })

  describe('未サポートデバイス', () => {
    it('未サポートデバイスでエラーが発生しない', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useVibration())

      // エラーが発生しないことを確認
      expect(() => {
        act(() => {
          result.current.vibrate(1)
        })
      }).not.toThrow()
    })

    it('未サポートデバイスでvibrate関数を呼び出しても何も起きない', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useVibration())

      act(() => {
        result.current.vibrate(2)
      })

      // モックが呼ばれていないことを確認
      expect(mockVibrate).not.toHaveBeenCalled()
    })
  })

  describe('ドキュメント非表示時', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: { vibrate: mockVibrate },
        writable: true,
        configurable: true,
      })
    })

    it('ドキュメントが非表示の場合、振動をスキップする', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useVibration())

      act(() => {
        result.current.vibrate(1)
      })

      // モックが呼ばれていないことを確認
      expect(mockVibrate).not.toHaveBeenCalled()
    })
  })

  describe('振動パターン定義', () => {
    it('VIBRATION_PATTERNSが正しく定義されている', () => {
      expect(VIBRATION_PATTERNS[1]).toBe(100)
      expect(VIBRATION_PATTERNS[2]).toEqual([100, 50, 100])
      expect(VIBRATION_PATTERNS[3]).toEqual([100, 50, 100, 50, 100, 50])
    })
  })
})
