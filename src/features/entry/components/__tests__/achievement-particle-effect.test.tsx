/**
 * @jest-environment jsdom
 */

/**
 * パーティクルエフェクトコンポーネントのテスト
 *
 * Requirements: 2.1, 2.2, 2.3, 5.1, 5.3, 5.5
 * - 各レベルで正しい数のパーティクルが表示される
 * - reduced-motion設定時にアニメーションが無効化される
 * - アニメーション完了後にDOM要素がクリーンアップされる
 */
import { render, screen, waitFor, act } from '@testing-library/react'
import { AchievementParticleEffect } from '../achievement-particle-effect'
import { PARTICLE_CONFIGS, getTotalDuration } from '../../constants/particle-config'

// framer-motionのモック
jest.mock('framer-motion', () => {
  const React = require('react')

  return {
    motion: {
      div: React.forwardRef(function MockMotionDiv(
        {
          children,
          className,
          style,
          custom,
          variants,
          initial,
          animate,
          exit,
          onAnimationComplete,
          ...props
        }: {
          children?: React.ReactNode
          className?: string
          style?: React.CSSProperties
          custom?: number
          variants?: Record<string, unknown>
          initial?: string
          animate?: string
          exit?: Record<string, unknown>
          onAnimationComplete?: () => void
        },
        ref: React.Ref<HTMLDivElement>
      ) {
        // data-testid属性を追加してパーティクルを識別可能に
        return React.createElement('div', {
          ...props,
          className,
          style,
          ref,
          'data-testid': className?.includes('rounded-full') ? 'particle' : undefined,
        }, children)
      }),
    },
    AnimatePresence: function MockAnimatePresence({ children }: { children: React.ReactNode }) {
      return children
    },
    useReducedMotion: jest.fn(() => false),
  }
})

describe('AchievementParticleEffect', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('レベル別パーティクル数', () => {
    it('Level 1で12個のパーティクルが表示される（1波）', () => {
      render(<AchievementParticleEffect level={1} />)

      const particles = screen.getAllByTestId('particle')
      expect(particles).toHaveLength(PARTICLE_CONFIGS[1].count * PARTICLE_CONFIGS[1].waves)
      expect(particles).toHaveLength(12)
    })

    it('Level 2で16個のパーティクルが2波で表示される（合計32個）', async () => {
      render(<AchievementParticleEffect level={2} />)

      // 最初の波
      let particles = screen.getAllByTestId('particle')
      expect(particles).toHaveLength(16)

      // 2波目のタイミングまで進める
      act(() => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        particles = screen.getAllByTestId('particle')
        expect(particles).toHaveLength(32) // 16 * 2波
      })
    })

    it('Level 3で24個のパーティクルが3波で表示される（合計72個）', async () => {
      render(<AchievementParticleEffect level={3} />)

      // 最初の波
      let particles = screen.getAllByTestId('particle')
      expect(particles).toHaveLength(24)

      // 2波目のタイミングまで進める
      act(() => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        particles = screen.getAllByTestId('particle')
        expect(particles).toHaveLength(48) // 24 * 2波
      })

      // 3波目のタイミングまで進める
      act(() => {
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        particles = screen.getAllByTestId('particle')
        expect(particles).toHaveLength(72) // 24 * 3波
      })
    })
  })

  describe('reduced-motion対応', () => {
    it('reduced-motion設定時はパーティクルが表示されない', () => {
      const { useReducedMotion } = require('framer-motion')
      useReducedMotion.mockReturnValue(true)

      render(<AchievementParticleEffect level={2} />)

      const particles = screen.queryAllByTestId('particle')
      expect(particles).toHaveLength(0)
    })

    it('reduced-motion設定時は即座にonCompleteが呼ばれる', () => {
      const { useReducedMotion } = require('framer-motion')
      useReducedMotion.mockReturnValue(true)

      const onComplete = jest.fn()
      render(<AchievementParticleEffect level={2} onComplete={onComplete} />)

      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('onCompleteコールバック', () => {
    it('アニメーション完了後にonCompleteが呼ばれる', async () => {
      const { useReducedMotion } = require('framer-motion')
      useReducedMotion.mockReturnValue(false)

      const onComplete = jest.fn()
      render(<AchievementParticleEffect level={1} onComplete={onComplete} />)

      // 総アニメーション時間まで進める
      act(() => {
        jest.advanceTimersByTime(getTotalDuration(1))
      })

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })
    })
  })

  describe('パーティクル設定の検証', () => {
    it('PARTICLE_CONFIGSが正しく定義されている', () => {
      expect(PARTICLE_CONFIGS[1]).toEqual({ count: 12, waves: 1, waveInterval: 0 })
      expect(PARTICLE_CONFIGS[2]).toEqual({ count: 16, waves: 2, waveInterval: 200 })
      expect(PARTICLE_CONFIGS[3]).toEqual({ count: 24, waves: 3, waveInterval: 200 })
    })

    it('getTotalDurationが正しい値を返す', () => {
      // Level 1: 0ms開始 + 500ms + 100ms = 600ms
      expect(getTotalDuration(1)).toBe(600)
      // Level 2: 200ms開始 + 500ms + 100ms = 800ms
      expect(getTotalDuration(2)).toBe(800)
      // Level 3: 400ms開始 + 500ms + 100ms = 1000ms
      expect(getTotalDuration(3)).toBe(1000)
    })
  })
})
