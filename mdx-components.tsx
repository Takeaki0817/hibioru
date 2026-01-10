import { useMDXComponents as getDocsMDXComponents } from '@/app/docs/components/mdx-components'
import type { ComponentType } from 'react'

// MDXComponents型の定義
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MDXComponents = Record<string, ComponentType<any> | undefined>

/**
 * ルートレベルのMDXコンポーネント設定
 * Next.js App RouterでMDXを使用するために必要
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return getDocsMDXComponents(components)
}
