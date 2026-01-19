import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { signOut, getCurrentUser, deleteAccount } from '../api/actions'

// Mock modules
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/safe-action', () => ({
  actionClient: {
    action: (fn: unknown) => fn,
  },
  authActionClient: {
    action: (fn: unknown) => fn,
  },
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// Type for mock Supabase client
type MockSupabaseClient = Partial<SupabaseClient>

// Type for mock admin client
interface MockAdminClient {
  storage: {
    from: jest.Mock
  }
  auth: {
    admin: {
      deleteUser: jest.Mock
    }
  }
}

// Type for mock user
interface MockUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  aud?: string
  created_at?: string
}

describe('Auth Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signOut', () => {
    it('should call supabase.auth.signOut and redirect to /', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({}),
        },
      }
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      await signOut()

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/')
    })

    it('should handle signOut errors gracefully', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockRejectedValue(new Error('Signout failed')),
        },
      }
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act & Assert
      await expect(signOut()).rejects.toThrow('Signout failed')
    })
  })

  describe('getCurrentUser', () => {
    it('should return authenticated user when user exists', async () => {
      // Arrange
      const mockUser: MockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01',
      }
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await getCurrentUser()

      // Assert
      expect(result).toEqual(mockUser)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should return null when user is not authenticated', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await getCurrentUser()

      // Assert
      expect(result).toBeNull()
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should handle getUser errors', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Session expired')),
        },
      }
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act & Assert
      await expect(getCurrentUser()).rejects.toThrow('Session expired')
    })
  })

  describe('deleteAccount', () => {
    it('should delete user and associated storage files successfully', async () => {
      // Arrange
      const userId = 'user-123'
      const mockUser: MockUser = { id: userId }
      const mockFiles = [
        { name: 'image1.jpg' },
        { name: 'image2.jpg' },
      ]
      const mockAdminClient: MockAdminClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: mockFiles }),
            remove: jest.fn().mockResolvedValue({ error: null }),
          }),
        },
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: null }),
          },
        },
      }
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({}),
        },
      }
      jest.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await deleteAccount({ ctx: { user: mockUser, supabase: mockSupabase as unknown as MockSupabaseClient } })

      // Assert
      expect(mockAdminClient.storage.from).toHaveBeenCalledWith('entry-images')
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(userId)
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('should delete user even if no files exist in storage', async () => {
      // Arrange
      const userId = 'user-123'
      const mockUser: MockUser = { id: userId }
      const mockAdminClient: MockAdminClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: [] }),
          }),
        },
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: null }),
          },
        },
      }
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({}),
        },
      }
      jest.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await deleteAccount({ ctx: { user: mockUser, supabase: mockSupabase as unknown as MockSupabaseClient } })

      // Assert
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(userId)
      expect(result).toEqual({ success: true })
    })

    it('should continue with user deletion if storage deletion fails', async () => {
      // Arrange
      const userId = 'user-123'
      const mockUser: MockUser = { id: userId }
      const mockFiles = [{ name: 'image1.jpg' }]
      const storageError = new Error('Storage deletion failed')
      const mockAdminClient: MockAdminClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: mockFiles }),
            remove: jest.fn().mockResolvedValue({ error: storageError }),
          }),
        },
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: null }),
          },
        },
      }
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({}),
        },
      }
      jest.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await deleteAccount({ ctx: { user: mockUser, supabase: mockSupabase as unknown as MockSupabaseClient } })

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Storage deletion failed', storageError)
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(userId)
      expect(result).toEqual({ success: true })
    })

    it('should throw error when auth deletion fails', async () => {
      // Arrange
      const userId = 'user-123'
      const mockUser: MockUser = { id: userId }
      const deleteError = new Error('Auth deletion failed')
      const mockAdminClient: MockAdminClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: [] }),
          }),
        },
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: deleteError }),
          },
        },
      }
      const mockSupabase = {
        auth: {
          signOut: jest.fn(),
        },
      }
      jest.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act & Assert
      await expect(
        deleteAccount({ ctx: { user: mockUser, supabase: mockSupabase as unknown as MockSupabaseClient } })
      ).rejects.toThrow('アカウント削除に失敗しました')
      expect(logger.error).toHaveBeenCalledWith('User deletion failed', deleteError)
    })

    it('should clear session even if signOut fails after user deletion', async () => {
      // Arrange
      const userId = 'user-123'
      const mockUser: MockUser = { id: userId }
      const mockAdminClient: MockAdminClient = {
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: [] }),
          }),
        },
        auth: {
          admin: {
            deleteUser: jest.fn().mockResolvedValue({ error: null }),
          },
        },
      }
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockRejectedValue(new Error('Session already deleted')),
        },
      }
      jest.mocked(createAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createAdminClient>)
      jest.mocked(createClient).mockResolvedValue(mockSupabase as unknown as MockSupabaseClient)

      // Act
      const result = await deleteAccount({ ctx: { user: mockUser, supabase: mockSupabase as unknown as MockSupabaseClient } })

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })
  })
})
