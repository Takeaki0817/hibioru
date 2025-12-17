'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Supabaseからサインアウト（ローカルセッションのみ削除）
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })

      if (signOutError) {
        throw signOutError
      }

      // ログインページにリダイレクト
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('ログアウトエラー:', err)
      setError('ログアウトに失敗しました。もう一度お試しください。')
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="w-full px-4 py-3 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'ログアウト中...' : 'ログアウト'}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ログアウトしますか？
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              もう一度ログインする場合は、Googleアカウントで認証が必要です。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  handleLogout()
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? '処理中...' : 'ログアウト'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
