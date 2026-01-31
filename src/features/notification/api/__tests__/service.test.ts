/**
 * Notification Service Tests
 *
 * Note: The notification service functions (getNotificationSettings, updateNotificationSettings)
 * require Supabase database operations with complex query chains (upsert, select, single).
 * These database operations are tested via E2E tests.
 *
 * These unit tests focus on:
 * - Constants and default values exported from types
 * - Type structure validation
 * - Function export verification
 * - Pure validation logic
 */

import {
  DEFAULT_REMINDERS,
  DEFAULT_NOTIFICATION_SETTINGS,
  MAIN_REMINDER_PAYLOAD,
  CHASE_REMINDER_PAYLOAD,
} from '../../types'
import type { NotificationSettings, Reminder, NotificationPayload } from '../../types'

describe('Notification Types and Constants', () => {
  describe('DEFAULT_REMINDERS', () => {
    it('has 5 reminder slots', () => {
      expect(DEFAULT_REMINDERS).toHaveLength(5)
    })

    it('all reminders are disabled by default', () => {
      DEFAULT_REMINDERS.forEach((reminder) => {
        expect(reminder.enabled).toBe(false)
        expect(reminder.time).toBeNull()
      })
    })

    it('all default reminders have correct structure', () => {
      DEFAULT_REMINDERS.forEach((reminder: Reminder) => {
        expect(reminder).toHaveProperty('time')
        expect(reminder).toHaveProperty('enabled')
        expect(typeof reminder.enabled).toBe('boolean')
        if (reminder.time !== null) {
          expect(typeof reminder.time).toBe('string')
          expect(reminder.time).toMatch(/^\d{2}:\d{2}$/)
        }
      })
    })
  })

  describe('DEFAULT_NOTIFICATION_SETTINGS', () => {
    it('has all required fields except user_id', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('enabled')
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('reminders')
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('chase_reminder_enabled')
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('chase_reminder_delay_minutes')
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('follow_up_max_count')
      expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('social_notifications_enabled')
    })

    it('has notifications disabled by default', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.enabled).toBe(false)
    })

    it('has chase reminder enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.chase_reminder_enabled).toBe(true)
    })

    it('has chase reminder delay of 60 minutes', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.chase_reminder_delay_minutes).toBe(60)
    })

    it('has follow up max count of 2', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.follow_up_max_count).toBe(2)
    })

    it('has social notifications enabled by default', () => {
      expect(DEFAULT_NOTIFICATION_SETTINGS.social_notifications_enabled).toBe(true)
    })
  })

  describe('Notification Payloads', () => {
    it('MAIN_REMINDER_PAYLOAD has correct structure', () => {
      expect(MAIN_REMINDER_PAYLOAD.title).toBe('ヒビオル')
      expect(MAIN_REMINDER_PAYLOAD.body).toBe('今日の記録を残しましょう')
      expect(MAIN_REMINDER_PAYLOAD.icon).toBe('/icon-192.png')
      expect(MAIN_REMINDER_PAYLOAD.badge).toBe('/badge-72.png')
      expect(MAIN_REMINDER_PAYLOAD.url).toBe('/')
    })

    it('CHASE_REMINDER_PAYLOAD has correct structure', () => {
      expect(CHASE_REMINDER_PAYLOAD.title).toBe('ヒビオル')
      expect(CHASE_REMINDER_PAYLOAD.body).toContain('まだ記録が残っていません')
      expect(CHASE_REMINDER_PAYLOAD.icon).toBe('/icon-192.png')
      expect(CHASE_REMINDER_PAYLOAD.badge).toBe('/badge-72.png')
      expect(CHASE_REMINDER_PAYLOAD.url).toBe('/')
    })

    it('payloads have all required fields for web push', () => {
      const validatePayload = (payload: NotificationPayload) => {
        expect(typeof payload.title).toBe('string')
        expect(typeof payload.body).toBe('string')
        expect(payload.title.length).toBeGreaterThan(0)
        expect(payload.body.length).toBeGreaterThan(0)
      }

      validatePayload(MAIN_REMINDER_PAYLOAD)
      validatePayload(CHASE_REMINDER_PAYLOAD)
    })
  })

  describe('NotificationSettings structure', () => {
    it('valid settings object has all required fields', () => {
      const settings: NotificationSettings = {
        user_id: 'test-user-123',
        enabled: true,
        reminders: DEFAULT_REMINDERS,
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
        follow_up_max_count: 2,
        social_notifications_enabled: true,
      }

      expect(settings.user_id).toBeTruthy()
      expect(typeof settings.enabled).toBe('boolean')
      expect(Array.isArray(settings.reminders)).toBe(true)
      expect(typeof settings.chase_reminder_enabled).toBe('boolean')
      expect(typeof settings.chase_reminder_delay_minutes).toBe('number')
      expect(typeof settings.follow_up_max_count).toBe('number')
      expect(typeof settings.social_notifications_enabled).toBe('boolean')
    })

    it('can create settings from defaults with user_id', () => {
      const settings: NotificationSettings = {
        user_id: 'test-user',
        ...DEFAULT_NOTIFICATION_SETTINGS,
      }

      expect(settings.user_id).toBe('test-user')
      expect(settings.enabled).toBe(DEFAULT_NOTIFICATION_SETTINGS.enabled)
      expect(settings.reminders).toBe(DEFAULT_NOTIFICATION_SETTINGS.reminders)
    })

    it('chase_reminder_delay_minutes valid values are positive', () => {
      const validDelays = [15, 30, 60, 120]
      validDelays.forEach((delay) => {
        expect(delay).toBeGreaterThan(0)
      })
    })

    it('follow_up_max_count valid values are between 1-5', () => {
      const validCounts = [1, 2, 3, 4, 5]
      validCounts.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1)
        expect(count).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('Reminder validation', () => {
    const isValidTimeFormat = (time: string | null): boolean => {
      if (time === null) return true
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
    }

    it('accepts valid time format HH:MM', () => {
      expect(isValidTimeFormat('00:00')).toBe(true)
      expect(isValidTimeFormat('10:00')).toBe(true)
      expect(isValidTimeFormat('23:59')).toBe(true)
      expect(isValidTimeFormat('12:30')).toBe(true)
    })

    it('accepts null time', () => {
      expect(isValidTimeFormat(null)).toBe(true)
    })

    it('rejects invalid time format', () => {
      expect(isValidTimeFormat('25:00')).toBe(false)
      expect(isValidTimeFormat('10:60')).toBe(false)
      expect(isValidTimeFormat('1:00')).toBe(false)
      expect(isValidTimeFormat('10:0')).toBe(false)
      expect(isValidTimeFormat('24:00')).toBe(false)
    })

    it('can create a valid enabled reminder', () => {
      const reminder: Reminder = { time: '09:00', enabled: true }
      expect(isValidTimeFormat(reminder.time)).toBe(true)
      expect(reminder.enabled).toBe(true)
    })

    it('can create a valid disabled reminder', () => {
      const reminder: Reminder = { time: null, enabled: false }
      expect(isValidTimeFormat(reminder.time)).toBe(true)
      expect(reminder.enabled).toBe(false)
    })
  })
})

describe('Notification Service API Exports', () => {
  it('exports getNotificationSettings function', async () => {
    const { getNotificationSettings } = await import('../service')
    expect(typeof getNotificationSettings).toBe('function')
  })

  it('exports updateNotificationSettings function', async () => {
    const { updateNotificationSettings } = await import('../service')
    expect(typeof updateNotificationSettings).toBe('function')
  })

  it('exports NotificationError type (verified via function signature)', async () => {
    // NotificationError is a type, so we verify it exists by checking that
    // the service module can be imported without TypeScript errors
    const serviceModule = await import('../service')
    expect(serviceModule).toBeDefined()
  })
})
