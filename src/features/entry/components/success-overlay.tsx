'use client'

import { motion } from 'framer-motion'

// オーバーレイのフェードイン/アウト（スケールなし）
const overlayVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15 },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

// チェックマーク円のバウンドアニメーション
const circleVariants = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
}

// チェックマークのパスアニメーション
const checkmarkVariants = {
  initial: { pathLength: 0 },
  animate: {
    pathLength: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.1 },
  },
}

interface SuccessOverlayProps {
  message?: string
}

/**
 * 成功時のチェックマークアニメーションオーバーレイ
 */
export function SuccessOverlay({ message = '記録しました！' }: SuccessOverlayProps) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-xl"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <span className="sr-only">記録が完了しました</span>
      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center"
          variants={circleVariants}
          initial="initial"
          animate="animate"
        >
          <motion.svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              variants={checkmarkVariants}
              initial="initial"
              animate="animate"
            />
          </motion.svg>
        </motion.div>
        <motion.p
          className="text-primary-500 font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  )
}
