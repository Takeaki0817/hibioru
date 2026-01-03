'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
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
    } catch {
      setError('ログアウトに失敗しました。もう一度お試しください。')
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            disabled={isLoading}
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
          >
            {isLoading ? 'ログアウト中...' : 'ログアウト'}
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>ログアウトしますか？</DialogTitle>
            <DialogDescription>
              もう一度ログインする場合は、Googleアカウントで認証が必要です。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false)
                handleLogout()
              }}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? '処理中...' : 'ログアウト'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </>
  )
}
