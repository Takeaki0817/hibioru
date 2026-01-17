'use client'

import { useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/lib/types/auth'
import { useAuthStore } from '@/features/auth/stores/auth-store'

// Supabaseユーザーをアプリケーション用User型に変換
function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? '',
    avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, setUser } = useAuthStore(
    useShallow((s) => ({
      initialize: s.initialize,
      setUser: s.setUser,
    }))
  )
  const supabase = createClient()

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialize(session?.user ? mapSupabaseUser(session.user) : null)
    })

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, initialize, setUser])

  return <>{children}</>
}

// useAuth フック（後方互換性のため維持）
export function useAuth() {
  const { user, isLoading } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isLoading: s.isLoading,
    }))
  )
  const supabase = createClient()

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    useAuthStore.getState().reset()
  }, [supabase.auth])

  return { user, isLoading, signOut }
}
