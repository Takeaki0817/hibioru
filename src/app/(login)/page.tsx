'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Roboto } from 'next/font/google'
import { createClient } from '@/lib/supabase/client'
import { classifyAuthError, parseErrorParam } from '@/features/auth/errors'
import type { AuthError } from '@/lib/types/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

// Google Sign-In ブランドガイドライン準拠のためのフォント
const roboto = Roboto({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
})

// アニメーション設定 - より滑らかで落ち着いた動き
const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  const errorParam = searchParams.get('error')
  const [error, setError] = useState<AuthError | null>(() => parseErrorParam(errorParam))

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError(classifyAuthError(signInError))
        setIsLoading(false)
      }
    } catch (err) {
      setError(classifyAuthError(err))
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* 左側: ブランディングエリア - デスクトップのみ表示 */}
      <motion.div
        className="hidden lg:flex relative lg:w-[55%] flex-col justify-center overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        {/* 背景グラデーション - よりシンプルに */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent" />

        {/* 単一の大きなブラー - ミニマルな装飾 */}
        <motion.div
          className="absolute top-1/3 -left-1/4 w-2/3 h-2/3 bg-primary/6 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* メインコンテンツ */}
        <div className="relative px-8 py-16 lg:px-20 lg:py-24 max-w-2xl">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {/* ロゴ */}
            <motion.div variants={slideUp} className="mb-14 lg:mb-16">
              <Logo size="2xl" className="text-foreground w-full h-auto" />
            </motion.div>

            {/* メインコピー */}
            <motion.h1
              className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-6"
              variants={slideUp}
            >
              日々を織る
            </motion.h1>

            <motion.p
              className="text-lg lg:text-xl text-muted-foreground mb-10 leading-relaxed"
              variants={slideUp}
            >
              ADHD当事者のための瞬間記録アプリ
            </motion.p>

            {/* 引用 - デスクトップのみ */}
            <motion.div
              className="hidden lg:flex items-start gap-4 pt-8 border-t border-primary/10"
              variants={slideUp}
            >
              <div className="w-1 h-12 bg-primary/30 rounded-full" />
              <blockquote className="text-sm text-muted-foreground/70 leading-relaxed italic">
                &ldquo;継続することが最大の目的。
                <br />
                立派な日記を書くことではない。&rdquo;
              </blockquote>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* 右側: ログインフォーム - フロストガラス効果 */}
      <div className="flex-1 lg:w-[45%] flex items-center justify-center px-6 py-12 lg:px-16">
        <motion.div
          className="w-full max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* フロストグラスカード */}
          <motion.div
            className="relative p-8 lg:p-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl"
            variants={slideUp}
          >
            {/* モバイル用ロゴ */}
            <div className="lg:hidden text-center mb-8">
              <Logo size="lg" className="mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                日々を織る思考記録アプリ
              </p>
            </div>

            {/* デスクトップ用タイトル */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                アカウントにログイン
              </h2>
              <p className="text-base text-muted-foreground">
                Googleアカウントで簡単にはじめられます
              </p>
            </div>

            {/* エラー表示 */}
            {error && error.message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="destructive">
                  <AlertDescription>
                    {error.message}
                    {error.retryable && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleRetry}
                        className="mt-2 p-0 h-auto text-destructive hover:text-destructive/80"
                      >
                        もう一度試す
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* ログインボタン - Google ブランドガイドライン準拠 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={cn(
                roboto.className,
                'w-full h-[40px] flex items-center justify-center gap-[10px]',
                'text-sm leading-5', // 14px / 20px
                'rounded-[4px]',
                'transition-opacity duration-200',
                'cursor-pointer',
                // Light theme (デフォルト)
                'bg-white text-[#1F1F1F] border border-[#747775]',
                // Dark theme
                'dark:bg-[#131314] dark:text-[#E3E3E3] dark:border-[#8E918F]',
                // Hover state
                'hover:opacity-90',
                // Disabled state
                'disabled:opacity-50 disabled:cursor-not-allowed',
                // Focus state
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
              )}
              aria-label="Googleでログイン"
            >
              {isLoading ? (
                <>
                  <div className="w-[18px] h-[18px] border-2 border-[#747775]/30 border-t-[#4285F4] rounded-full animate-spin dark:border-[#8E918F]/30" />
                  <span>ログイン中...</span>
                </>
              ) : (
                <>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    />
                    <path
                      fill="#34A853"
                      d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    />
                  </svg>
                  <span>Googleでログイン</span>
                </>
              )}
            </button>

            {/* 利用規約 */}
            <p className="mt-6 text-left text-sm text-muted-foreground leading-relaxed">
              ログインすることで、
              <Link
                href="/docs/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                利用規約
              </Link>
              と
              <Link
                href="/docs/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                プライバシーポリシー
              </Link>
              に同意したものとみなします。
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Logo size="lg" className="text-foreground/50" />
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </motion.div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
