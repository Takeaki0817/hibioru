/**
 * Auth Errors ユニットテスト
 * @jest-environment node
 */

import {
  classifyAuthError,
  createCancelledError,
  parseErrorParam,
} from '../errors'
import type { AuthError } from '@/lib/types/auth'

describe('auth/errors', () => {
  describe('classifyAuthError', () => {
    describe('ネットワークエラー分類', () => {
      it.each([
        ['network', 'Network error occurred'],
        ['fetch', 'Fetch failed'],
        ['connection', 'Connection refused'],
        ['timeout', 'Request timeout'],
        ['offline', 'Device is offline'],
      ])(
        '"%s"を含むエラーメッセージをネットワークエラーとして分類する',
        (keyword, message) => {
          // Arrange
          const error = new Error(message)

          // Act
          const result = classifyAuthError(error)

          // Assert
          expect(result.type).toBe('network')
          expect(result.message).toBe(
            'ネットワークに接続できませんでした。接続を確認して、もう一度お試しください。'
          )
          expect(result.retryable).toBe(true)
        }
      )

      it('大文字小文字を区別せずにネットワークエラーを判定する', () => {
        // Arrange
        const error = new Error('NETWORK ERROR')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
      })
    })

    describe('認証エラー分類', () => {
      it.each([
        ['auth', 'Auth error occurred'],
        ['unauthorized', 'Unauthorized access'],
        ['forbidden', 'Forbidden resource'],
        ['invalid', 'Invalid credentials'],
        ['expired', 'Token expired'],
      ])(
        '"%s"を含むエラーメッセージを認証エラーとして分類する',
        (keyword, message) => {
          // Arrange
          const error = new Error(message)

          // Act
          const result = classifyAuthError(error)

          // Assert
          expect(result.type).toBe('auth')
          expect(result.message).toBe(
            'ログインできませんでした。もう一度お試しください。'
          )
          expect(result.retryable).toBe(true)
        }
      )

      it('ステータス401を認証エラーとして分類する', () => {
        // Arrange
        const error = { status: 401, message: 'Unauthorized' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
      })

      it('ステータス403を認証エラーとして分類する', () => {
        // Arrange
        const error = { status: 403, message: 'Forbidden' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
      })
    })

    describe('不明エラー分類', () => {
      it('分類できないエラーを不明エラーとして分類する', () => {
        // Arrange
        const error = new Error('Something went wrong')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.message).toBe(
          '問題が発生しました。しばらくしてからお試しください。'
        )
        expect(result.retryable).toBe(true)
      })

      it('nullを不明エラーとして分類する', () => {
        // Act
        const result = classifyAuthError(null)

        // Assert
        expect(result.type).toBe('unknown')
      })

      it('undefinedを不明エラーとして分類する', () => {
        // Act
        const result = classifyAuthError(undefined)

        // Assert
        expect(result.type).toBe('unknown')
      })

      it('空オブジェクトを不明エラーとして分類する', () => {
        // Act
        const result = classifyAuthError({})

        // Assert
        expect(result.type).toBe('unknown')
      })

      it('文字列を不明エラーとして分類する', () => {
        // Act
        const result = classifyAuthError('error string')

        // Assert
        expect(result.type).toBe('unknown')
      })

      it('数値を不明エラーとして分類する', () => {
        // Act
        const result = classifyAuthError(500)

        // Assert
        expect(result.type).toBe('unknown')
      })
    })

    describe('エラー優先順位', () => {
      it('ネットワークエラーと認証エラーの両方を含む場合、ネットワークエラーを優先する', () => {
        // Arrange
        const error = new Error('network auth error')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
      })
    })
  })

  describe('createCancelledError', () => {
    it('キャンセルエラーを生成する', () => {
      // Act
      const result = createCancelledError()

      // Assert
      expect(result).toEqual<AuthError>({
        type: 'cancelled',
        message: '',
        retryable: false,
      })
    })

    it('リトライ不可のエラーを返す', () => {
      // Act
      const result = createCancelledError()

      // Assert
      expect(result.retryable).toBe(false)
    })
  })

  describe('parseErrorParam', () => {
    it('auth_failedパラメータを認証エラーとしてパースする', () => {
      // Act
      const result = parseErrorParam('auth_failed')

      // Assert
      expect(result).toEqual<AuthError>({
        type: 'auth',
        message: 'ログインできませんでした。もう一度お試しください。',
        retryable: true,
      })
    })

    it('nullパラメータをnullとして処理する', () => {
      // Act
      const result = parseErrorParam(null)

      // Assert
      expect(result).toBeNull()
    })

    it('空文字パラメータをnullとして処理する', () => {
      // Act
      const result = parseErrorParam('')

      // Assert
      expect(result).toBeNull()
    })

    it('不明なパラメータをnullとして処理する', () => {
      // Act
      const result = parseErrorParam('unknown_error')

      // Assert
      expect(result).toBeNull()
    })

    it('別のエラーパラメータをnullとして処理する', () => {
      // Act
      const result = parseErrorParam('server_error')

      // Assert
      expect(result).toBeNull()
    })
  })
})
