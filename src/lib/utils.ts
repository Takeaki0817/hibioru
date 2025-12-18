import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * clsxとtailwind-mergeを組み合わせたユーティリティ関数
 * 条件付きクラス名とTailwindクラスの競合解決を行う
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
