import type { MDXComponents } from 'mdx/types'
import { useMDXComponents as useDocsMDXComponents } from '@/app/docs/components/mdx-components'

/**
 * グローバルMDXコンポーネント設定
 * Next.js App Routerでは、このファイルがルートに必要
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return useDocsMDXComponents(components)
}
