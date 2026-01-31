/**
 * Notification Sender Tests
 *
 * Note: Complex async database operations are tested via E2E tests.
 * These unit tests focus on pure functions and exports.
 */

import { getCurrentDayOfWeek, isTimeToSendNotification } from '../sender'

describe('Notification Sender - Pure Functions', () => {
  describe('getCurrentDayOfWeek', () => {
    it('タイムゾーン考慮した曜日取得 - 月曜日', () => {
      // Arrange: 2025-01-20 21:00 JST (Monday)
      const testDate = new Date('2025-01-20T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(1)
    })

    it('タイムゾーン考慮した曜日取得 - 日曜日', () => {
      // Arrange: 2025-01-19 21:00 JST (Sunday)
      const testDate = new Date('2025-01-19T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(0)
    })

    it('タイムゾーン考慮した曜日取得 - 土曜日', () => {
      // Arrange: 2025-01-18 21:00 JST (Saturday)
      const testDate = new Date('2025-01-18T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(6)
    })

    it('日付変更線をまたぐケース', () => {
      // Arrange: 2025-01-17 23:30 UTC = 2025-01-18 08:30 JST (Saturday)
      const testDate = new Date('2025-01-17T23:30:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert: JST では土曜日
      expect(dayOfWeek).toBe(6)
    })
  })

  describe('isTimeToSendNotification', () => {
    it('時刻と曜日が一致する場合は true', () => {
      // Arrange: 2025-01-20 19:00 JST (Monday)
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(true)
    })

    it('時刻が一致しない場合は false', () => {
      // Arrange: 2025-01-20 18:00 JST (not 19:00)
      const testDate = new Date('2025-01-20T09:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(false)
    })

    it('曜日が一致しない場合は false', () => {
      // Arrange: Monday but activeDays doesn't include Monday
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [3, 5], // Wed, Fri only
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(false)
    })

    it('複数の有効な曜日が指定されている場合', () => {
      // Arrange: Monday and activeDays includes Monday
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1, 3, 5], // Mon, Wed, Fri
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(true)
    })

    it('全曜日が有効な場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(true)
    })
  })
})

describe('Notification Sender API Exports', () => {
  it('exports getCurrentDayOfWeek function', async () => {
    const { getCurrentDayOfWeek } = await import('../sender')
    expect(typeof getCurrentDayOfWeek).toBe('function')
  })

  it('exports isTimeToSendNotification function', async () => {
    const { isTimeToSendNotification } = await import('../sender')
    expect(typeof isTimeToSendNotification).toBe('function')
  })

  it('exports shouldSkipNotification function', async () => {
    const { shouldSkipNotification } = await import('../sender')
    expect(typeof shouldSkipNotification).toBe('function')
  })

  it('exports dispatchMainNotification function', async () => {
    const { dispatchMainNotification } = await import('../sender')
    expect(typeof dispatchMainNotification).toBe('function')
  })
})
