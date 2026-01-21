import {
  useAuthStore,
  selectIsAuthenticated,
  selectUserId,
  type AuthStore,
} from '../auth-store'
import type { User } from '@/lib/types/auth'

// Helper function to create mock state for selectors
function createMockState(partial: {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
}): AuthStore {
  return {
    ...partial,
    setUser: jest.fn(),
    setLoading: jest.fn(),
    initialize: jest.fn(),
    reset: jest.fn(),
  }
}

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isInitialized: false,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      // Act
      const state = useAuthStore.getState()

      // Assert
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(true)
      expect(state.isInitialized).toBe(false)
    })
  })

  describe('setUser', () => {
    it('should update user when provided with valid user data', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      }

      // Act
      useAuthStore.getState().setUser(mockUser)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.user?.id).toBe('user-123')
      expect(state.user?.email).toBe('test@example.com')
    })

    it('should clear user when called with null', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().setUser(mockUser)

      // Act
      useAuthStore.getState().setUser(null)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('should update user without affecting loading state', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.setState({ isLoading: true })

      // Act
      useAuthStore.getState().setUser(mockUser)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(true)
    })

    it('should replace existing user with new user', () => {
      // Arrange
      const user1: User = {
        id: 'user-1',
        email: 'user1@example.com',
        displayName: 'User 1',
        avatarUrl: null,
      }
      const user2: User = {
        id: 'user-2',
        email: 'user2@example.com',
        displayName: 'User 2',
        avatarUrl: 'https://example.com/avatar2.jpg',
      }
      useAuthStore.getState().setUser(user1)

      // Act
      useAuthStore.getState().setUser(user2)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user?.id).toBe('user-2')
      expect(state.user?.email).toBe('user2@example.com')
    })
  })

  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      // Act
      useAuthStore.getState().setLoading(true)

      // Assert
      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('should set isLoading to false', () => {
      // Arrange
      useAuthStore.setState({ isLoading: true })

      // Act
      useAuthStore.getState().setLoading(false)

      // Assert
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should not affect user or isInitialized', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.setState({ user: mockUser, isInitialized: true })

      // Act
      useAuthStore.getState().setLoading(false)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isInitialized).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should allow multiple consecutive updates', () => {
      // Act
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setLoading(false)
      useAuthStore.getState().setLoading(true)

      // Assert
      expect(useAuthStore.getState().isLoading).toBe(true)
    })
  })

  describe('initialize', () => {
    it('should set user and mark as initialized', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }

      // Act
      useAuthStore.getState().initialize(mockUser)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isInitialized).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should initialize without user (null)', () => {
      // Act
      useAuthStore.getState().initialize(null)

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isInitialized).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should set isLoading to false when initialized', () => {
      // Arrange
      useAuthStore.setState({ isLoading: true })

      // Act
      useAuthStore.getState().initialize(null)

      // Assert
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should mark isInitialized as true regardless of user', () => {
      // Act & Assert
      useAuthStore.getState().initialize(null)
      expect(useAuthStore.getState().isInitialized).toBe(true)

      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().initialize(mockUser)
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })
  })

  describe('reset', () => {
    it('should clear user and set isLoading to false', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().initialize(mockUser)

      // Act
      useAuthStore.getState().reset()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('should maintain isInitialized as true after reset', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().initialize(mockUser)
      expect(useAuthStore.getState().isInitialized).toBe(true)

      // Act
      useAuthStore.getState().reset()

      // Assert
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })

    it('should reset from initialized state with user', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      }
      useAuthStore.getState().initialize(mockUser)

      // Act
      useAuthStore.getState().reset()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('should reset from uninitialized state', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.setState({ user: mockUser, isLoading: true, isInitialized: false })

      // Act
      useAuthStore.getState().reset()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('selectIsAuthenticated', () => {
    it('should return true when user is authenticated and initialized', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      const state = createMockState({
        user: mockUser,
        isLoading: false,
        isInitialized: true,
      })

      // Act
      const result = selectIsAuthenticated(state)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when user is null but initialized', () => {
      // Arrange
      const state = createMockState({
        user: null,
        isLoading: false,
        isInitialized: true,
      })

      // Act
      const result = selectIsAuthenticated(state)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when not initialized', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      const state = createMockState({
        user: mockUser,
        isLoading: true,
        isInitialized: false,
      })

      // Act
      const result = selectIsAuthenticated(state)

      // Assert
      expect(result).toBe(false)
    })

    it('should require both initialization and valid user', () => {
      // Arrange
      const testCases: Array<{ user: User | null; isInitialized: boolean }> = [
        { user: null, isInitialized: false }, // not initialized
        { user: null, isInitialized: true }, // initialized but no user
        {
          user: { id: 'u1', email: 'test@example.com', displayName: 'Test', avatarUrl: null },
          isInitialized: false,
        }, // not initialized
      ]

      // Act & Assert
      testCases.forEach(({ user, isInitialized }) => {
        const state = createMockState({
          user,
          isLoading: false,
          isInitialized,
        })
        expect(selectIsAuthenticated(state)).toBe(false)
      })
    })

    it('should work with real store state', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().initialize(mockUser)

      // Act
      const result = selectIsAuthenticated(useAuthStore.getState())

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('selectUserId', () => {
    it('should return user id when user exists', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      const state = createMockState({
        user: mockUser,
        isLoading: false,
        isInitialized: true,
      })

      // Act
      const result = selectUserId(state)

      // Assert
      expect(result).toBe('user-123')
    })

    it('should return undefined when user is null', () => {
      // Arrange
      const state = createMockState({
        user: null,
        isLoading: false,
        isInitialized: true,
      })

      // Act
      const result = selectUserId(state)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should extract id from user object', () => {
      // Arrange
      const mockUser: User = {
        id: 'specific-id-456',
        email: 'user@example.com',
        displayName: 'User Name',
        avatarUrl: 'https://example.com/avatar.jpg',
      }
      const state = createMockState({
        user: mockUser,
        isLoading: false,
        isInitialized: true,
      })

      // Act
      const result = selectUserId(state)

      // Assert
      expect(result).toBe('specific-id-456')
    })

    it('should work with real store state after initialization', () => {
      // Arrange
      const mockUser: User = {
        id: 'real-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }
      useAuthStore.getState().initialize(mockUser)

      // Act
      const result = selectUserId(useAuthStore.getState())

      // Assert
      expect(result).toBe('real-user-id')
    })

    it('should work with real store state when user is null', () => {
      // Arrange
      useAuthStore.getState().initialize(null)

      // Act
      const result = selectUserId(useAuthStore.getState())

      // Assert
      expect(result).toBeUndefined()
    })
  })

  describe('multiple state updates', () => {
    it('should handle rapid consecutive updates correctly', () => {
      // Arrange
      const mockUser1: User = {
        id: 'user-1',
        email: 'user1@example.com',
        displayName: 'User 1',
        avatarUrl: null,
      }
      const mockUser2: User = {
        id: 'user-2',
        email: 'user2@example.com',
        displayName: 'User 2',
        avatarUrl: null,
      }

      // Act
      useAuthStore.getState().setUser(mockUser1)
      useAuthStore.getState().initialize(mockUser2)
      useAuthStore.getState().reset()

      // Assert
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('should maintain state consistency through multiple operations', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
      }

      // Act
      useAuthStore.getState().setLoading(false)
      useAuthStore.getState().setUser(mockUser)
      const userId = selectUserId(useAuthStore.getState())
      const isAuth = selectIsAuthenticated(useAuthStore.getState())

      // Assert
      expect(userId).toBe('user-123')
      expect(isAuth).toBe(false) // not initialized yet
    })
  })
})

