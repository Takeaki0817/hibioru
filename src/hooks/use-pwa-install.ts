'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { logger } from '@/lib/logger'

/**
 * BeforeInstallPromptEvent の型定義
 * ブラウザのPWAインストールプロンプトイベント
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// LocalStorage のキー
const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7日間

/**
 * 初期状態を計算するヘルパー関数
 */
function getInitialState() {
  if (typeof window === 'undefined') {
    return { isStandalone: false, isIOS: false, isDismissed: false }
  }

  // スタンドアロンモードの判定
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

  // iOSの判定
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)

  // 非表示期間のチェック
  let isDismissed = false
  const dismissedAt = localStorage.getItem(INSTALL_DISMISSED_KEY)
  if (dismissedAt) {
    const dismissedTime = parseInt(dismissedAt, 10)
    if (Date.now() - dismissedTime < DISMISS_DURATION) {
      isDismissed = true
    } else {
      localStorage.removeItem(INSTALL_DISMISSED_KEY)
    }
  }

  return { isStandalone, isIOS, isDismissed }
}

/**
 * PWAインストール状態を管理するフック
 *
 * @returns PWAインストール関連の状態と関数
 */
export function usePwaInstall() {
  // 初期状態を遅延初期化で取得
  const initialState = useMemo(() => getInitialState(), [])

  // インストールプロンプトイベントを保持
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // インストール可能かどうか
  const [canInstall, setCanInstall] = useState(false)
  // iOSかどうか
  const [isIOS] = useState(initialState.isIOS)
  // スタンドアロンモード（既にインストール済み）かどうか
  const [isStandalone, setIsStandalone] = useState(initialState.isStandalone)
  // ユーザーが「後で」を選択して非表示にしたか
  const [isDismissed, setIsDismissed] = useState(initialState.isDismissed)

  // beforeinstallprompt イベントのハンドリング
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      // ブラウザのデフォルトプロンプトを抑制
      event.preventDefault()
      // イベントを保存
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setCanInstall(true)
      logger.info('[PWA] インストールプロンプトが利用可能になりました')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // インストール完了時
    const handleAppInstalled = () => {
      logger.info('[PWA] アプリがインストールされました')
      setDeferredPrompt(null)
      setCanInstall(false)
      setIsStandalone(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // インストールを実行
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      logger.warn('[PWA] インストールプロンプトが利用できません')
      return false
    }

    try {
      // プロンプトを表示
      await deferredPrompt.prompt()
      // ユーザーの選択を待つ
      const { outcome } = await deferredPrompt.userChoice

      logger.info('[PWA] ユーザーの選択:', outcome)

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setCanInstall(false)
        return true
      }

      return false
    } catch (error) {
      logger.error('[PWA] インストールエラー:', error)
      return false
    }
  }, [deferredPrompt])

  // 「後で」を選択
  const dismiss = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString())
    setIsDismissed(true)
    logger.info('[PWA] インストールプロンプトを非表示にしました')
  }, [])

  // バナーを表示すべきか
  const shouldShowBanner = !isStandalone && !isDismissed && (canInstall || isIOS)

  return {
    // 状態
    canInstall,       // ネイティブインストールが可能か（Android/Chrome）
    isIOS,            // iOSかどうか（手動インストール案内用）
    isStandalone,     // 既にインストール済みか
    isDismissed,      // ユーザーが非表示にしたか
    shouldShowBanner, // バナーを表示すべきか
    // アクション
    install,          // インストールを実行
    dismiss,          // 「後で」を選択
  }
}
