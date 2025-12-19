'use client'

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import { useStore, type StoreApi } from 'zustand'

/**
 * Zustandストア用のContext/Provider/Hookを生成するユーティリティ
 * Next.js App Routerでの使用を想定し、リクエストごとに分離されたストアを作成
 *
 * @example
 * const { StoreProvider, useStoreHook } = createStoreContext(createTimelineStore)
 * // Providerでラップ
 * <StoreProvider>
 *   <Component />
 * </StoreProvider>
 * // コンポーネント内でストア使用
 * const currentDate = useStoreHook(s => s.currentDate)
 */
export function createStoreContext<T>(
  createStoreFn: () => StoreApi<T>,
  displayName?: string
) {
  const StoreContext = createContext<StoreApi<T> | null>(null)
  StoreContext.displayName = displayName ?? 'StoreContext'

  /**
   * ストアをコンポーネントツリーに提供するProvider
   * ストアはProviderのマウント時に一度だけ作成される
   */
  function StoreProvider({ children }: { children: ReactNode }) {
    const storeRef = useRef<StoreApi<T> | null>(null)
    if (storeRef.current === null) {
      storeRef.current = createStoreFn()
    }

    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    )
  }
  StoreProvider.displayName = displayName
    ? `${displayName}Provider`
    : 'StoreProvider'

  /**
   * ストアから状態を取得するカスタムフック
   * セレクターを使用して必要な状態のみを購読し、不要な再レンダリングを防止
   *
   * @param selector 状態から必要な値を抽出する関数
   * @throws Provider外で使用した場合にエラー
   */
  function useStoreHook<U>(selector: (state: T) => U): U {
    const store = useContext(StoreContext)
    if (!store) {
      throw new Error(
        `useStoreHook must be used within ${displayName ?? 'StoreProvider'}`
      )
    }
    return useStore(store, selector)
  }

  /**
   * ストアAPIに直接アクセスするためのフック
   * getState()やsubscribe()を使用する場合に利用
   */
  function useStoreApi(): StoreApi<T> {
    const store = useContext(StoreContext)
    if (!store) {
      throw new Error(
        `useStoreApi must be used within ${displayName ?? 'StoreProvider'}`
      )
    }
    return store
  }

  return {
    StoreContext,
    StoreProvider,
    useStoreHook,
    useStoreApi,
  }
}
