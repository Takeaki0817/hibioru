import { classifyAuthError, createCancelledError, parseErrorParam } from '../errors'

describe('Auth Error Handling', () => {
  describe('classifyAuthError', () => {
    describe('network errors', () => {
      it('should classify network error message', () => {
        // Arrange
        const error = new Error('network connection failed')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
        expect(result.retryable).toBe(true)
        expect(result.message).toContain('ネットワークに接続できません')
      })

      it('should classify fetch error', () => {
        // Arrange
        const error = new Error('fetch failed')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
        expect(result.retryable).toBe(true)
      })

      it('should classify connection error', () => {
        // Arrange
        const error = new Error('connection timeout')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
        expect(result.retryable).toBe(true)
      })

      it('should classify timeout error', () => {
        // Arrange
        const error = new Error('request timeout')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
        expect(result.retryable).toBe(true)
      })

      it('should classify offline error', () => {
        // Arrange
        const error = new Error('offline mode')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
        expect(result.retryable).toBe(true)
      })

      it('should be case insensitive', () => {
        // Arrange
        const error = new Error('NETWORK CONNECTION FAILED')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('network')
      })
    })

    describe('auth errors', () => {
      it('should classify auth error message', () => {
        // Arrange
        const error = new Error('auth failed')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
        expect(result.message).toContain('ログインできませんでした')
      })

      it('should classify unauthorized error', () => {
        // Arrange
        const error = new Error('unauthorized access')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })

      it('should classify forbidden error', () => {
        // Arrange
        const error = new Error('forbidden')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })

      it('should classify invalid credentials error', () => {
        // Arrange
        const error = new Error('invalid credentials')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })

      it('should classify expired session error', () => {
        // Arrange
        const error = new Error('session expired')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })

      it('should classify Supabase 401 error', () => {
        // Arrange
        const error = { status: 401, message: 'Unauthorized' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })

      it('should classify Supabase 403 error', () => {
        // Arrange
        const error = { status: 403, message: 'Forbidden' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('auth')
        expect(result.retryable).toBe(true)
      })
    })

    describe('unknown errors', () => {
      it('should classify unknown error type', () => {
        // Arrange
        const error = new Error('something went wrong')

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.retryable).toBe(true)
        expect(result.message).toContain('問題が発生しました')
      })

      it('should classify non-Error objects as unknown', () => {
        // Arrange
        const error = { custom: 'error' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.retryable).toBe(true)
      })

      it('should classify null as unknown', () => {
        // Arrange
        const error = null

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.retryable).toBe(true)
      })

      it('should classify undefined as unknown', () => {
        // Arrange
        const error = undefined

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.retryable).toBe(true)
      })

      it('should classify Supabase error with other status codes', () => {
        // Arrange
        const error = { status: 500, message: 'Server error' }

        // Act
        const result = classifyAuthError(error)

        // Assert
        expect(result.type).toBe('unknown')
        expect(result.retryable).toBe(true)
      })
    })

    describe('retryable property', () => {
      it('all error types should have retryable: true', () => {
        // Arrange
        const errors = [
          new Error('network error'),
          new Error('auth error'),
          new Error('unknown error'),
        ]

        // Act & Assert
        errors.forEach((error) => {
          const result = classifyAuthError(error)
          expect(result.retryable).toBe(true)
        })
      })
    })
  })

  describe('createCancelledError', () => {
    it('should create cancelled error with correct type', () => {
      // Act
      const error = createCancelledError()

      // Assert
      expect(error.type).toBe('cancelled')
    })

    it('should create cancelled error with empty message', () => {
      // Act
      const error = createCancelledError()

      // Assert
      expect(error.message).toBe('')
    })

    it('should create cancelled error with retryable: false', () => {
      // Act
      const error = createCancelledError()

      // Assert
      expect(error.retryable).toBe(false)
    })

    it('should return a valid AuthError type', () => {
      // Act
      const error = createCancelledError()

      // Assert
      expect(error).toHaveProperty('type')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('retryable')
    })
  })

  describe('parseErrorParam', () => {
    it('should parse auth_failed error parameter', () => {
      // Act
      const result = parseErrorParam('auth_failed')

      // Assert
      expect(result).not.toBeNull()
      expect(result?.type).toBe('auth')
      expect(result?.retryable).toBe(true)
      expect(result?.message).toContain('ログインできませんでした')
    })

    it('should return null for null parameter', () => {
      // Act
      const result = parseErrorParam(null)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for unknown error code', () => {
      // Act
      const result = parseErrorParam('unknown_error')

      // Assert
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      // Act
      const result = parseErrorParam('')

      // Assert
      expect(result).toBeNull()
    })

    it('should be case sensitive for error codes', () => {
      // Act
      const result = parseErrorParam('AUTH_FAILED')

      // Assert
      expect(result).toBeNull()
    })

    it('should return AuthError with correct message format', () => {
      // Act
      const result = parseErrorParam('auth_failed')

      // Assert
      expect(result?.message).toBe('ログインできませんでした。もう一度お試しください。')
    })
  })
})
