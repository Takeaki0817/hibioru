'use client'

import { useReducer, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Check, X, Loader2, Copy } from 'lucide-react'
import { updateProfile, checkUsernameAvailability } from '../api/profile'
import { USERNAME_RULES } from '../constants'
import { useDebouncedCallback } from 'use-debounce'

// フォームの状態型定義
interface FormState {
  isEditing: boolean
  username: string
  displayName: string
  usernameError: string | null
  isCheckingUsername: boolean
  error: string | null
  isCopied: boolean
}

// アクション型定義
type FormAction =
  | { type: 'START_EDIT' }
  | { type: 'CANCEL_EDIT'; payload: { username: string; displayName: string } }
  | { type: 'SET_USERNAME'; payload: string }
  | { type: 'SET_DISPLAY_NAME'; payload: string }
  | { type: 'SET_USERNAME_ERROR'; payload: string | null }
  | { type: 'SET_CHECKING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SAVE_SUCCESS' }

// 初期状態を生成する関数
function createInitialState(
  initialUsername: string | null,
  initialDisplayName: string | null
): FormState {
  return {
    isEditing: false,
    username: initialUsername ?? '',
    displayName: initialDisplayName ?? '',
    usernameError: null,
    isCheckingUsername: false,
    error: null,
    isCopied: false,
  }
}

// リデューサー関数（コンポーネント外で定義）
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'START_EDIT':
      return { ...state, isEditing: true }
    case 'CANCEL_EDIT':
      return {
        ...state,
        isEditing: false,
        username: action.payload.username,
        displayName: action.payload.displayName,
        usernameError: null,
        error: null,
      }
    case 'SET_USERNAME':
      return { ...state, username: action.payload, usernameError: null }
    case 'SET_DISPLAY_NAME':
      return { ...state, displayName: action.payload }
    case 'SET_USERNAME_ERROR':
      return { ...state, usernameError: action.payload }
    case 'SET_CHECKING':
      return { ...state, isCheckingUsername: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_COPIED':
      return { ...state, isCopied: action.payload }
    case 'SAVE_SUCCESS':
      return { ...state, isEditing: false, error: null }
    default:
      return state
  }
}

interface ProfileEditFormProps {
  initialUsername: string | null
  initialDisplayName: string | null
}

/**
 * プロフィール編集フォーム
 * username と display_name の編集が可能
 */
export function ProfileEditForm({
  initialUsername,
  initialDisplayName,
}: ProfileEditFormProps) {
  const [state, dispatch] = useReducer(
    formReducer,
    { initialUsername, initialDisplayName },
    (init) => createInitialState(init.initialUsername, init.initialDisplayName)
  )
  const [isPending, startTransition] = useTransition()

  const { isEditing, username, displayName, usernameError, isCheckingUsername, error, isCopied } = state

  // ユーザーIDをクリップボードにコピー
  const handleCopyUserId = useCallback(async () => {
    if (!initialUsername) return
    try {
      await navigator.clipboard.writeText(`@${initialUsername}`)
      dispatch({ type: 'SET_COPIED', payload: true })
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000)
    } catch {
      // コピー失敗時は何もしない
    }
  }, [initialUsername])

  // ユーザー名のバリデーション
  const validateUsernameLocal = useCallback((value: string): string | null => {
    if (value.length < USERNAME_RULES.MIN_LENGTH) {
      return `${USERNAME_RULES.MIN_LENGTH}文字以上で入力してください`
    }
    if (value.length > USERNAME_RULES.MAX_LENGTH) {
      return `${USERNAME_RULES.MAX_LENGTH}文字以下で入力してください`
    }
    if (!USERNAME_RULES.PATTERN.test(value)) {
      return '半角英数字とアンダースコアのみ使用できます'
    }
    return null
  }, [])

  // ユーザー名の重複チェック（デバウンス付き）
  const checkUsername = useDebouncedCallback(async (value: string) => {
    const validationError = validateUsernameLocal(value)
    if (validationError) {
      dispatch({ type: 'SET_USERNAME_ERROR', payload: validationError })
      dispatch({ type: 'SET_CHECKING', payload: false })
      return
    }

    // 変更がない場合はスキップ
    if (value === initialUsername) {
      dispatch({ type: 'SET_USERNAME_ERROR', payload: null })
      dispatch({ type: 'SET_CHECKING', payload: false })
      return
    }

    dispatch({ type: 'SET_CHECKING', payload: true })
    const result = await checkUsernameAvailability({ username: value })
    dispatch({ type: 'SET_CHECKING', payload: false })

    if (result.serverError) {
      dispatch({ type: 'SET_USERNAME_ERROR', payload: '確認中にエラーが発生しました' })
    } else if (result.data) {
      if (result.data.available) {
        dispatch({ type: 'SET_USERNAME_ERROR', payload: null })
      } else {
        dispatch({ type: 'SET_USERNAME_ERROR', payload: 'このユーザーIDは既に使用されています' })
      }
    }
  }, 500)

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    dispatch({ type: 'SET_USERNAME', payload: value })

    if (value.length >= USERNAME_RULES.MIN_LENGTH) {
      dispatch({ type: 'SET_CHECKING', payload: true })
      checkUsername(value)
    }
  }

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_DISPLAY_NAME', payload: e.target.value })
  }

  const handleCancel = () => {
    dispatch({
      type: 'CANCEL_EDIT',
      payload: {
        username: initialUsername ?? '',
        displayName: initialDisplayName ?? '',
      },
    })
  }

  const handleSave = () => {
    if (usernameError || isCheckingUsername) return

    startTransition(async () => {
      const result = await updateProfile({
        username: username !== initialUsername ? username : undefined,
        displayName: displayName !== initialDisplayName ? displayName : undefined,
      })

      if (result.serverError) {
        dispatch({ type: 'SET_ERROR', payload: result.serverError })
      } else if (result.data) {
        dispatch({ type: 'SAVE_SUCCESS' })
        // ページをリロードしてデータを更新
        window.location.reload()
      }
    })
  }

  const hasChanges =
    username !== initialUsername || displayName !== initialDisplayName

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">プロフィール</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'START_EDIT' })}
              className="h-8 w-8 p-0"
              aria-label="プロフィールを編集"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">表示名</span>
            <p className="font-medium">{initialDisplayName || '未設定'}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">ユーザーID</span>
            <div className="flex items-center gap-1">
              <p className="font-medium">
                {initialUsername ? `@${initialUsername}` : '未設定'}
              </p>
              {initialUsername && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUserId}
                  className="h-6 w-6 p-0"
                  aria-label="ユーザーIDをコピー"
                >
                  {isCopied ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">プロフィール編集</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
              className="h-8 w-8 p-0"
              aria-label="編集をキャンセル"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isPending || !hasChanges || !!usernameError || isCheckingUsername}
              className="h-8 w-8 p-0"
              aria-label="プロフィールを保存"
              aria-busy={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert" aria-live="assertive">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="表示名を入力"
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">ユーザーID</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="username"
              className="pl-8"
              maxLength={USERNAME_RULES.MAX_LENGTH}
            />
            {isCheckingUsername && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {usernameError && (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">{usernameError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {USERNAME_RULES.MIN_LENGTH}〜{USERNAME_RULES.MAX_LENGTH}文字、半角英数字とアンダースコアのみ
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
