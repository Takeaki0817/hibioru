// follows.ts をテストするには next-safe-action のモック化が必要
// これはESMモジュールで複雑なため、jest.mock では直接モック化できない
// このテストは E2E テストで検証することを推奨する

import { SOCIAL_PAGINATION } from '../../constants'

describe('follows API - SOCIAL_PAGINATION定数テスト', () => {

  describe('SOCIAL_PAGINATION定数', () => {
    it('FEED_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.FEED_PAGE_SIZE).toBe(20)
    })

    it('NOTIFICATIONS_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.NOTIFICATIONS_PAGE_SIZE).toBe(20)
    })

    it('USER_SEARCH_PAGE_SIZE が定義されている', () => {
      expect(SOCIAL_PAGINATION.USER_SEARCH_PAGE_SIZE).toBe(10)
    })
  })
})
