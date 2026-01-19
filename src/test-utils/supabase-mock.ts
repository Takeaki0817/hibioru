/**
 * Supabase Mock Factory for Jest Tests
 *
 * Provides chainable mock methods for Supabase client operations.
 * Usage:
 *   const { mockSupabase, createChainMock } = createSupabaseMock()
 *   (createClient as jest.Mock).mockResolvedValue(mockSupabase)
 */

export interface MockQueryResult<T = unknown> {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number
}

export interface ChainableMock {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  upsert: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is: jest.Mock
  in: jest.Mock
  or: jest.Mock
  and: jest.Mock
  not: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  range: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  match: jest.Mock
  filter: jest.Mock
  contains: jest.Mock
  containedBy: jest.Mock
  textSearch: jest.Mock
}

/**
 * Creates a chainable mock that returns itself for all methods
 * except terminal methods (single, maybeSingle) which return the result
 */
export function createChainMock(result: MockQueryResult = { data: null, error: null }): ChainableMock {
  const chainMock: ChainableMock = {} as ChainableMock

  // All chainable methods return the mock object itself
  const chainableMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'or',
    'and',
    'not',
    'order',
    'limit',
    'range',
    'match',
    'filter',
    'contains',
    'containedBy',
    'textSearch',
  ]

  // Terminal methods return the result
  const terminalMethods = ['single', 'maybeSingle']

  chainableMethods.forEach((method) => {
    chainMock[method as keyof ChainableMock] = jest.fn().mockReturnValue(chainMock)
  })

  terminalMethods.forEach((method) => {
    chainMock[method as keyof ChainableMock] = jest.fn().mockResolvedValue(result)
  })

  // Make the chain itself thenable (for queries without single/maybeSingle)
  // @ts-expect-error - Adding then to make it thenable
  chainMock.then = (resolve: (value: MockQueryResult) => unknown) => {
    return Promise.resolve(result).then(resolve)
  }

  return chainMock
}

/**
 * Creates a complete Supabase client mock with auth support
 */
export function createSupabaseMock(options?: {
  user?: { id: string; email?: string } | null
  queryResult?: MockQueryResult
}) {
  const { user = { id: 'test-user-id', email: 'test@example.com' }, queryResult = { data: null, error: null } } =
    options ?? {}

  const chainMock = createChainMock(queryResult)

  const mockSupabase = {
    from: jest.fn().mockReturnValue(chainMock),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }

  return {
    mockSupabase,
    chainMock,
    createChainMock,
  }
}

/**
 * Helper to set up a specific query result for a table
 */
export function mockTableQuery(
  mockSupabase: ReturnType<typeof createSupabaseMock>['mockSupabase'],
  tableName: string,
  result: MockQueryResult
) {
  const chainMock = createChainMock(result)
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return chainMock
    }
    return createChainMock({ data: null, error: null })
  })
  return chainMock
}

/**
 * Helper to mock multiple tables with different results
 */
export function mockMultipleTables(
  mockSupabase: ReturnType<typeof createSupabaseMock>['mockSupabase'],
  tableResults: Record<string, MockQueryResult>
) {
  const chainMocks: Record<string, ChainableMock> = {}

  Object.entries(tableResults).forEach(([tableName, result]) => {
    chainMocks[tableName] = createChainMock(result)
  })

  mockSupabase.from.mockImplementation((table: string) => {
    return chainMocks[table] || createChainMock({ data: null, error: null })
  })

  return chainMocks
}

/**
 * Reset all mocks in the Supabase mock
 */
export function resetSupabaseMock(mockSupabase: ReturnType<typeof createSupabaseMock>['mockSupabase']) {
  mockSupabase.from.mockClear()
  mockSupabase.auth.getUser.mockClear()
  mockSupabase.auth.getSession.mockClear()
  mockSupabase.rpc.mockClear()
}
