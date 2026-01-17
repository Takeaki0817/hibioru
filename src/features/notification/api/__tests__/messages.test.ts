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
  describe('getMainMessage', () => {
    it('メインメッセージをランダムに選択', () => {
      // Arrange
      const messages = new Set<string>()

      // Act
      for (let i = 0; i < 20; i++) {
        const message = getMainMessage()
        messages.add(message.body)
      }

      // Assert
      expect(messages.size).toBeGreaterThan(1)
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
  })

  describe('メッセージ配列の構成', () => {
    it('MAIN_MESSAGES配列は5要素以上', () => {
      expect(MAIN_MESSAGES.length).toBeGreaterThanOrEqual(5)
    })

    it('FOLLOW_UP_1_MESSAGES配列は5要素以上', () => {
      expect(FOLLOW_UP_1_MESSAGES.length).toBeGreaterThanOrEqual(5)
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
