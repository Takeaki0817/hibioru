/**
 * 達成レベル別パーティクル設定
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * - Level 1: 12個のパーティクルを1波で放射状に表示
 * - Level 2: 16個のパーティクルを2波で断続的に表示
 * - Level 3: 24個のパーティクルを3波で断続的に表示
 * - 各波の間隔は200ミリ秒
 * - パーティクルはアクセントカラー（accent-400）で表示
 */
import type { AchievementLevel } from '@/features/social/utils/achievement-level'

// パーティクル設定の型
export interface ParticleConfig {
  count: number       // パーティクル数
  waves: number       // 波数
  waveInterval: number // 波の間隔(ms)
}

// レベル別パーティクル設定
export const PARTICLE_CONFIGS: Record<AchievementLevel, ParticleConfig> = {
  1: { count: 12, waves: 1, waveInterval: 0 },
  2: { count: 16, waves: 2, waveInterval: 200 },
  3: { count: 24, waves: 3, waveInterval: 200 },
}

// アニメーション設定
export const PARTICLE_ANIMATION = {
  // 1パーティクルのアニメーション時間（ms）
  DURATION: 500,
  // 放射距離（px）
  DISTANCE: 48,
  // パーティクルカラー（Tailwind CSS クラス）
  COLORS: ['bg-accent-400', 'bg-accent-300', 'bg-celebrate-400'],
  // パーティクルサイズ（Tailwind CSS クラス）
  SIZES: ['size-2', 'size-2.5', 'size-3'],
} as const

// 波ごとのタイムライン（開始時間ms）
export function getWaveTimeline(level: AchievementLevel): number[] {
  const config = PARTICLE_CONFIGS[level]
  return Array.from({ length: config.waves }, (_, i) => i * config.waveInterval)
}

// 総アニメーション時間（ms）
export function getTotalDuration(level: AchievementLevel): number {
  const config = PARTICLE_CONFIGS[level]
  const lastWaveStart = (config.waves - 1) * config.waveInterval
  return lastWaveStart + PARTICLE_ANIMATION.DURATION + 100 // 100ms余裕
}

// パーティクル生成関数
export interface Particle {
  id: number
  angle: number        // 放射角度（度）
  distance: number     // 放射距離（px）
  color: string        // Tailwindカラークラス
  size: string         // Tailwindサイズクラス
  delay: number        // アニメーション遅延（秒）
}

export function generateParticlesForWave(count: number, waveIndex: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: waveIndex * 1000 + i, // ユニークID（波ごとにオフセット）
    angle: (360 / count) * i + Math.random() * 20 - 10, // 均等配置 + ランダムなオフセット
    distance: PARTICLE_ANIMATION.DISTANCE + Math.random() * 12 - 6, // 距離に少しランダム性
    color: PARTICLE_ANIMATION.COLORS[Math.floor(Math.random() * PARTICLE_ANIMATION.COLORS.length)],
    size: PARTICLE_ANIMATION.SIZES[Math.floor(Math.random() * PARTICLE_ANIMATION.SIZES.length)],
    delay: Math.random() * 0.08, // 微小な遅延でより自然に
  }))
}
