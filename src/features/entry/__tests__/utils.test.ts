/**
 * entry utils のテスト
 * @jest-environment node
 */

import { isEditable } from '../utils'
import type { Entry } from '../types'

describe('isEditable', () => {
  // テスト用のエントリを生成するヘルパー
  const createEntry = (createdAt: Date): Entry => ({
    id: 'test-entry-id',
    user_id: 'test-user-id',
    content: 'テスト投稿',
    image_urls: null,
    created_at: createdAt.toISOString(),
    is_shared: false,
  })

  describe('編集可能なケース', () => {
    it('作成直後のエントリは編集可能', () => {
      // Arrange: 現在時刻で作成されたエントリ
      const entry = createEntry(new Date())

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(true)
    })

    it('23時間後のエントリは編集可能', () => {
      // Arrange: 23時間前に作成されたエントリ
      const twentyThreeHoursAgo = new Date()
      twentyThreeHoursAgo.setHours(twentyThreeHoursAgo.getHours() - 23)
      const entry = createEntry(twentyThreeHoursAgo)

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(true)
    })

    it('境界値: 23時間59分59秒後のエントリは編集可能', () => {
      // Arrange: 23時間59分59秒前に作成されたエントリ（ほぼ24時間だがまだ以内）
      const almostTwentyFourHours = new Date()
      almostTwentyFourHours.setHours(almostTwentyFourHours.getHours() - 23)
      almostTwentyFourHours.setMinutes(almostTwentyFourHours.getMinutes() - 59)
      almostTwentyFourHours.setSeconds(almostTwentyFourHours.getSeconds() - 59)
      const entry = createEntry(almostTwentyFourHours)

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(true)
    })

    it('境界値: ちょうど24時間のエントリは編集可能（24時間以内の判定）', () => {
      // Arrange: ちょうど24時間前に作成されたエントリ
      const exactlyTwentyFourHours = new Date()
      exactlyTwentyFourHours.setHours(exactlyTwentyFourHours.getHours() - 24)
      const entry = createEntry(exactlyTwentyFourHours)

      // Act
      const result = isEditable(entry)

      // Assert: hoursSinceCreation <= 24 なのでちょうど24時間は編集可能
      expect(result).toBe(true)
    })
  })

  describe('編集不可なケース', () => {
    it('24時間1秒後のエントリは編集不可', () => {
      // Arrange: 24時間と1秒前に作成されたエントリ
      const overTwentyFourHours = new Date()
      overTwentyFourHours.setHours(overTwentyFourHours.getHours() - 24)
      overTwentyFourHours.setSeconds(overTwentyFourHours.getSeconds() - 1)
      const entry = createEntry(overTwentyFourHours)

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(false)
    })

    it('25時間後のエントリは編集不可', () => {
      // Arrange: 25時間前に作成されたエントリ
      const twentyFiveHoursAgo = new Date()
      twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25)
      const entry = createEntry(twentyFiveHoursAgo)

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(false)
    })

    it('48時間後のエントリは編集不可', () => {
      // Arrange: 48時間前に作成されたエントリ
      const fortyEightHoursAgo = new Date()
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)
      const entry = createEntry(fortyEightHoursAgo)

      // Act
      const result = isEditable(entry)

      // Assert
      expect(result).toBe(false)
    })
  })
})
