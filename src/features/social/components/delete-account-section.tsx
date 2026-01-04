'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteAccount } from '@/features/auth/api/actions'

const CONFIRMATION_TEXT = 'delete'

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmValid = confirmText === CONFIRMATION_TEXT

  const handleDelete = async () => {
    if (!isConfirmValid) {
      setError(`「${CONFIRMATION_TEXT}」と入力してください`)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await deleteAccount()

      if (!result.ok) {
        setError(result.error.message)
        setIsLoading(false)
        return
      }

      // 削除成功、ルートへハードリダイレクト（セッション削除後はrouter.pushが動作しないため）
      window.location.href = '/'
    } catch {
      setError('予期しないエラーが発生しました')
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // ダイアログを閉じる時に状態をリセット
      setConfirmText('')
      setError(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isLoading}
          >
            アカウントを削除
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>アカウントを削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。すべての記録、ストリーク、設定が完全に削除されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="confirm-delete"
              className="text-sm text-muted-foreground"
            >
              確認のため「{CONFIRMATION_TEXT}」と入力してください
            </label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              disabled={isLoading}
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

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
              onClick={handleDelete}
              disabled={isLoading || !isConfirmValid}
              className="flex-1"
            >
              {isLoading ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && !open && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </>
  )
}
