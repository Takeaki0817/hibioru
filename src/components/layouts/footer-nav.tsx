'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarDays, MessageCirclePlus, User, Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants, strongButtonVariants } from '@/lib/animations'

// 中央ボタンのカスタマイズ用props
interface CenterButtonProps {
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

interface FooterNavProps {
  centerButton?: CenterButtonProps
}

export function FooterNav({ centerButton }: FooterNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/timeline',
      label: 'タイムライン',
      icon: CalendarDays,
    },
    {
      href: '/new',
      label: '記録',
      icon: MessageCirclePlus,
      isCenter: true,
    },
    {
      href: '/mypage',
      label: 'マイページ',
      icon: User,
    },
  ]

  return (
    <nav aria-label="メインナビゲーション" className="shrink-0 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          if (item.isCenter) {
            // カスタム中央ボタン（送信ボタン等）
            if (centerButton) {
              const CenterIcon = centerButton.icon || Check
              return (
                <motion.div
                  key="center-button"
                  variants={!centerButton.disabled ? strongButtonVariants : undefined}
                  whileTap={!centerButton.disabled ? 'tap' : undefined}
                  whileHover={!centerButton.disabled ? 'hover' : undefined}
                  className="relative -mt-6"
                >
                  <button
                    type="button"
                    onClick={centerButton.onClick}
                    disabled={centerButton.disabled || centerButton.isLoading}
                    className={cn(
                      'flex items-center justify-center w-16 h-16 rounded-full shadow-lg',
                      'transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
                      centerButton.disabled || centerButton.isLoading
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    )}
                    aria-label={centerButton.isLoading ? '送信中' : '送信'}
                  >
                    {centerButton.isLoading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-7 h-7 border-3 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <CenterIcon className="w-8 h-8" />
                    )}
                  </button>
                </motion.div>
              )
            }

            // デフォルトの中央ボタン（/newへのリンク）
            return (
              <motion.div
                key={item.href}
                variants={strongButtonVariants}
                whileTap="tap"
                whileHover="hover"
                className="relative -mt-6"
              >
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    'flex items-center justify-center w-16 h-16 rounded-full shadow-lg',
                    'bg-primary-500 text-white',
                    'hover:bg-primary-600 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2'
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-8 h-8" />
                </Link>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={item.href}
              variants={buttonVariants}
              whileTap="tap"
              className="flex-1"
            >
              <Link
                href={item.href}
                prefetch={true}
                className={cn(
                  'flex flex-col items-center justify-center h-full py-2 transition-colors',
                  isActive
                    ? 'text-primary-500 dark:text-primary-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                <span className={cn('text-xs mt-1', isActive && 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </nav>
  )
}
