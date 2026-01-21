/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // server-onlyパッケージをモック（Jestはサーバー環境で実行）
    '^server-only$': '<rootDir>/__mocks__/server-only.js',
    // ESMのみ提供するパッケージをモック
    '^next-safe-action$': '<rootDir>/__mocks__/next-safe-action.js',
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
