/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // server-onlyパッケージをモック（Jestはサーバー環境で実行）
    '^server-only$': '<rootDir>/__mocks__/server-only.js',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/types/**',
    '!lib/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}

module.exports = config
