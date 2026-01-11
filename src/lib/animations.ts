/**
 * アニメーション設定の中央化
 * framer-motionのバリアント・スプリング設定を集約
 */

import type { Variants, Transition } from 'framer-motion'

// === スプリング設定 ===
// ADHDユーザー向けの心地よいアニメーション
export const springs = {
  // 控えめなアニメーション
  subtle: { type: 'spring', stiffness: 350, damping: 30 } as Transition,
  // 標準的なアニメーション
  normal: { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  // 素早いアニメーション
  snappy: { type: 'spring', stiffness: 500, damping: 15 } as Transition,
} as const

// === ボタン系バリアント ===
// ホバー時のscaleは避ける（触れる領域が変化するため）
export const buttonVariants: Variants = {
  tap: { scale: 0.97 },
  // hover: サイズ変化なし、CSSで色変化を適用
}

// 強めのボタンタップ
export const strongButtonVariants: Variants = {
  tap: { scale: 0.95 },
  // hover: サイズ変化なし
}

// === カード系バリアント ===
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  hover: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' },
  tap: { scale: 0.99 },
}

// === フェード系バリアント ===
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// スライドフェード
export const slideFadeVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

// === パルス系バリアント（ストリーク・達成用） ===
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    transition: { duration: 2, repeat: Infinity },
  },
}

// 炎のアニメーション（ストリーク）
export const flameVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    rotate: [-3, 3, -3],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// === 成功チェックマーク ===
export const checkmarkVariants: Variants = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1, transition: { duration: 0.4 } },
}

// === スケール系バリアント ===
export const scaleInVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
}

// ドットスケールイン
export const dotScaleVariants: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
}

// === 警告・注意系バリアント ===
export const warningShakeVariants: Variants = {
  animate: {
    x: [-2, 2, -2, 2, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
}

export const cautionPulseVariants: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
}

// === 今日のパルス ===
export const todayPulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
}

// === 数値ハイライト（記録更新時） ===
export const numberHighlightVariants: Variants = {
  initial: { scale: 1.1, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
}

// === スピナー（ローディング） ===
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// === 週間ドットのアニメーション（ストリーク表示用） ===
export const dotAnimationVariants: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },
}

// === 今日のドットパルス（ストリーク表示用） ===
export const todayDotPulseVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// === 新記録ハイライト（ストリーク表示用） ===
export const recordHighlightVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.3, 0],
    transition: { duration: 1.5, repeat: Infinity },
  },
}

// === タブスライド（スワイプ切り替え用） ===
export const tabSlideTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

// === リストアイテム（フィード・通知用） ===
// フィードアイテム: 上からフェードイン
export const feedItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springs.subtle,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
}

// 通知アイテム: 左からスライドイン
export const notificationItemVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springs.subtle,
  },
}

// リストコンテナ: 子要素を順次表示
export const listContainerVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.03 },
  },
}

// === パーティクル系バリアント（お祝いエフェクト用） ===
// カスタムパラメータの型定義
export interface ParticleAnimationConfig {
  angle: number
  distance: number
  delay: number
}

// パーティクルアニメーション: 放射状に広がるエフェクト
export const particleVariants = {
  initial: { scale: 0, opacity: 1, rotate: 0 },
  animate: (custom: ParticleAnimationConfig) => ({
    scale: [0, 1.8, 0],
    opacity: [1, 1, 0],
    rotate: [0, 220],
    x: Math.cos((custom.angle * Math.PI) / 180) * custom.distance,
    y: Math.sin((custom.angle * Math.PI) / 180) * custom.distance,
    transition: {
      duration: 0.4,
      ease: 'easeInOut' as const,
      delay: custom.delay * 0.5,
    },
  }),
}
