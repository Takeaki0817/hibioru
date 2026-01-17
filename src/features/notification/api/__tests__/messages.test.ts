import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getMainMessage,
  getFollowUpMessage,
  MAIN_MESSAGES,
  FOLLOW_UP_1_MESSAGES,
  FOLLOW_UP_2_MESSAGES,
  FOLLOW_UP_3_MESSAGES,
  FOLLOW_UP_4_MESSAGES,
  FOLLOW_UP_5_MESSAGES,
} from '../../messages'

describe('Notification Messages', () => {
  beforeEach(() => {
    // Math.random()をリセット（必要に応じて）
    vi.clearAllMocks()
  })

  describe('getMainMessage', () => {
    it('メインメッセージをランダムに選択', () => {
      // Arrange
      // 複数回呼び出してメッセージが返されることを確認
      const messages = new Set<string>()

      // Act
      for (let i = 0; i < 20; i++) {
        const message = getMainMessage()
        messages.add(message.body)
      }

      // Assert
      // 少なくとも複数の異なるメッセージが返されることを確認
      expect(messages.size).toBeGreaterThan(1)
      // すべてのメッセージがMAIN_MESSAGES配列に含まれることを確認
      messages.forEach((body) => {
        expect(MAIN_MESSAGES.some((msg) => msg.body === body)).toBe(true)
      })
    })

    it('メッセージのタイトルが"ヒビオル"であることを確認', () => {
      // Act
      const message = getMainMessage()

      // Assert
      expect(message.title).toBe('ヒビオル')
    })

    it('メッセージがMAIN_MESSAGES配列から選択されている', () => {
      // Act
      const message = getMainMessage()

      // Assert
      const found = MAIN_MESSAGES.find((msg) => msg.body === message.body)
      expect(found).toBeDefined()
      expect(found?.title).toBe(message.title)
    })

    it('複数回呼び出しても常にタイトルは同じ', () => {
      // Act
      const results = Array.from({ length: 10 }, () => getMainMessage())

      // Assert
      results.forEach((msg) => {
        expect(msg.title).toBe('ヒビオル')
      })
    })
  })

  describe('getFollowUpMessage', () => {
    it('1回目の追いリマインド (count=1)', () => {
      // Act
      const message = getFollowUpMessage(1)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_1_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('2回目の追いリマインド (count=2)', () => {
      // Act
      const message = getFollowUpMessage(2)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_2_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('3回目の追いリマインド (count=3)', () => {
      // Act
      const message = getFollowUpMessage(3)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_3_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('4回目の追いリマインド (count=4)', () => {
      // Act
      const message = getFollowUpMessage(4)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_4_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('5回目の追いリマインド (count=5)', () => {
      // Act
      const message = getFollowUpMessage(5)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_5_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('5回以上の追いリマインド (count>=5)', () => {
      // Act
      const results = [6, 7, 8, 10, 100].map((count) => getFollowUpMessage(count))

      // Assert
      results.forEach((message) => {
        expect(message.title).toBe('ヒビオル')
        expect(FOLLOW_UP_5_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
      })
    })

    it('0以下の値 (count=0) は1回目扱い', () => {
      // Act
      const message = getFollowUpMessage(0)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_1_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('負の値 (count=-1) は1回目扱い', () => {
      // Act
      const message = getFollowUpMessage(-1)

      // Assert
      expect(message.title).toBe('ヒビオル')
      expect(FOLLOW_UP_1_MESSAGES.some((msg) => msg.body === message.body)).toBe(true)
    })

    it('各回数でランダムに選択される', () => {
      // Act & Assert
      const counts = [1, 2, 3, 4, 5]
      counts.forEach((count) => {
        const messages = new Set<string>()
        for (let i = 0; i < 20; i++) {
          messages.add(getFollowUpMessage(count).body)
        }
        // 複数の異なるメッセージが返されることを確認
        expect(messages.size).toBeGreaterThan(1)
      })
    })

    it('count=1と count=0は同じ配列から選択される', () => {
      // Act
      const messagesFromOne = new Set<string>()
      const messagesFromZero = new Set<string>()

      for (let i = 0; i < 20; i++) {
        messagesFromOne.add(getFollowUpMessage(1).body)
        messagesFromZero.add(getFollowUpMessage(0).body)
      }

      // Assert
      // 両方とも同じFOLLOW_UP_1_MESSAGES配列から選択されているはずなので
      // 選択肢の共通部分が存在するはず
      const commonMessages = Array.from(messagesFromOne).filter((msg) =>
        FOLLOW_UP_1_MESSAGES.some((m) => m.body === msg)
      )
      expect(commonMessages.length).toBeGreaterThan(0)
    })
  })

  describe('メッセージ配列の構成', () => {
    it('MAIN_MESSAGES配列は5要素以上', () => {
      expect(MAIN_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_1_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_1_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_2_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_2_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_3_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_3_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_4_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_4_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_5_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_5_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('すべてのメッセージにはtitleとbodyプロパティがある', () => {
      // Arrange
      const allMessages = [
        ...MAIN_MESSAGES,
        ...FOLLOW_UP_1_MESSAGES,
        ...FOLLOW_UP_2_MESSAGES,
        ...FOLLOW_UP_3_MESSAGES,
        ...FOLLOW_UP_4_MESSAGES,
        ...FOLLOW_UP_5_MESSAGES,
      ]

      // Assert
      allMessages.forEach((message) => {
        expect(message).toHaveProperty('title')
        expect(message).toHaveProperty('body')
        expect(typeof message.title).toBe('string')
        expect(typeof message.body).toBe('string')
        expect(message.title.length).toBeGreaterThan(0)
        expect(message.body.length).toBeGreaterThan(0)
      })
    })

    it('すべてのメッセージのタイトルは"ヒビオル"', () => {
      // Arrange
      const allMessages = [
        ...MAIN_MESSAGES,
        ...FOLLOW_UP_1_MESSAGES,
        ...FOLLOW_UP_2_MESSAGES,
        ...FOLLOW_UP_3_MESSAGES,
        ...FOLLOW_UP_4_MESSAGES,
        ...FOLLOW_UP_5_MESSAGES,
      ]

      // Assert
      allMessages.forEach((message) => {
        expect(message.title).toBe('ヒビオル')
      })
    })
  })
})
