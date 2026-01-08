'use client'

import { useEffect } from 'react'

/**
 * ドキュメントページ用のbodyスタイル制御
 * globals.cssのoverflow-hidden/h-fullを上書きしてスクロールを有効化
 */
export function DocsBodyStyle() {
  useEffect(() => {
    // 元のスタイルを保存
    const htmlStyle = document.documentElement.style.cssText
    const bodyStyle = document.body.style.cssText

    // stickyが機能するには、スクロールコンテナは1つのみにする必要がある
    // htmlがスクロールコンテナ、bodyはvisibleに設定
    document.documentElement.style.overflow = 'auto'
    document.documentElement.style.height = 'auto'
    document.body.style.overflow = 'visible'
    document.body.style.height = 'auto'

    // クラスも追加（CSS用）
    document.body.classList.add('docs-body')
    document.documentElement.classList.add('docs-html')

    return () => {
      // クリーンアップ時に元のスタイルを復元
      document.documentElement.style.cssText = htmlStyle
      document.body.style.cssText = bodyStyle
      document.body.classList.remove('docs-body')
      document.documentElement.classList.remove('docs-html')
    }
  }, [])

  return null
}
