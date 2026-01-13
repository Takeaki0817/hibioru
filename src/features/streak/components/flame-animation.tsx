'use client'

import { useEffect } from 'react'
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FlameAnimationProps {
  /** 炎のスケール（0.9-1.3） */
  scale: number
  /** 新記録到達時の爆発アニメーションを発火するか */
  triggerExplosion?: boolean
  /** 追加のクラス名 */
  className?: string
}

/**
 * スケールに応じたグローエフェクトを生成
 * 炎が大きいほど明るく輝く（二重グローで立体感）
 */
function getGlowFilter(scale: number): string {
  // スケール0.9-1.3を0-1に正規化
  const intensity = Math.min(Math.max((scale - 0.9) / 0.4, 0), 1)
  // 内側グロー（黄色・シャープ）
  const innerBlur = 6 + intensity * 6
  // 外側グロー（オレンジ・ソフト）
  const outerBlur = 12 + intensity * 12
  return `drop-shadow(0 0 ${innerBlur}px hsl(45, 100%, 60%)) drop-shadow(0 0 ${outerBlur}px hsl(25, 100%, 50%))`
}


/**
 * Riveベースの炎アニメーションコンポーネント
 *
 * Fire_emoji by alice.tran (CC BY)
 * https://rive.app/marketplace/6689-12919-fireemoji/
 */
export function FlameAnimation({
  scale,
  triggerExplosion = false,
  className,
}: FlameAnimationProps) {
  const { rive, RiveComponent } = useRive({
    src: '/animations/flame.riv',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  })

  // Riveアニメーションを再生
  useEffect(() => {
    if (rive) {
      rive.play()
    }
  }, [rive])

  // スケール0の場合は表示しない
  if (scale <= 0) {
    return null
  }

  return (
    <motion.div
      className={cn('relative', className)}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        filter: getGlowFilter(scale),
      }}
      animate={
        triggerExplosion
          ? {
              scale: [scale, scale * 1.8, scale],
              transition: { duration: 0.5, ease: 'easeOut' },
            }
          : {}
      }
      aria-hidden="true"
    >
      <RiveComponent
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </motion.div>
  )
}
