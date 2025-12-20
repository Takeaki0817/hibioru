'use client'

import { useEffect, useCallback } from 'react'

/**
 * Service Workerの登録と自動更新を管理するコンポーネント
 *
 * 機能:
 * - Service Workerの登録
 * - 新バージョンの検知と自動更新
 * - 更新後の自動リロード
 */
export function ServiceWorkerRegistration() {
  // 新しいService Workerが待機状態になったときに更新を促す
  const handleWaitingServiceWorker = useCallback((registration: ServiceWorkerRegistration) => {
    const waitingSW = registration.waiting
    if (waitingSW) {
      console.log('[PWA] 新しいバージョンが利用可能です。更新中...')
      // 待機中のSWにスキップを指示
      waitingSW.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let refreshing = false

    // コントローラーが変わったらページをリロード
    const handleControllerChange = () => {
      if (refreshing) return
      refreshing = true
      console.log('[PWA] Service Workerが更新されました。リロードします...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Service Workerを登録
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker登録成功')

        // 既に待機中のSWがあれば更新
        if (registration.waiting) {
          handleWaitingServiceWorker(registration)
          return
        }

        // 新しいSWのインストールを検知
        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing
          if (!newSW) return

          console.log('[PWA] 新しいService Workerをインストール中...')

          // 新SWの状態変化を監視
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいSWがインストール完了し、既存のコントローラーがある場合
              // （= アップデート時）
              console.log('[PWA] 新しいService Workerがインストールされました')
              handleWaitingServiceWorker(registration)
            }
          })
        })

        // 定期的に更新をチェック（1時間ごと）
        setInterval(() => {
          registration.update().catch(() => {
            // 更新チェックエラーは無視
          })
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker登録エラー:', error)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [handleWaitingServiceWorker])

  return null
}
