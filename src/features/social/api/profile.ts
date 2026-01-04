'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createSafeError } from '@/lib/error-handler'
import type { PublicUserInfo, SocialResult, UpdateProfileInput } from '../types'
import {
  validateUsername,
  validateDisplayName,
  sanitizeDisplayName,
} from '../constants'

/**
 * ユーザーIDでプロフィールを取得
 */
export async function getProfileById(userId: string): Promise<SocialResult<PublicUserInfo>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません' },
      }
    }

    return {
      ok: true,
      value: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}

/**
 * usernameでプロフィールを取得
 */
export async function getProfileByUsername(username: string): Promise<SocialResult<PublicUserInfo>> {
  try {
    const supabase = await createClient()

    // @付きの場合は除去
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('username', cleanUsername)
      .single()

    if (error || !data) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません' },
      }
    }

    return {
      ok: true,
      value: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}

/**
 * 自分のプロフィールを取得
 */
export async function getMyProfile(): Promise<SocialResult<PublicUserInfo>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    return getProfileById(userData.user.id)
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}

/**
 * ユーザー名の利用可能性をチェック
 */
export async function checkUsernameAvailability(
  username: string
): Promise<SocialResult<{ available: boolean }>> {
  try {
    // バリデーション
    const validation = validateUsername(username)
    if (!validation.valid) {
      return {
        ok: false,
        error: { code: 'INVALID_USERNAME', message: validation.error! },
      }
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // 自分以外で同じusernameを持つユーザーがいるかチェック
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', userData.user.id)
      .maybeSingle()

    if (error) {
      logger.error('ユーザー名重複チェック失敗', error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', error),
      }
    }

    return {
      ok: true,
      value: { available: data === null },
    }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}

/**
 * プロフィールを更新
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<SocialResult<PublicUserInfo>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // usernameが指定されている場合はバリデーション
    if (input.username) {
      const validation = validateUsername(input.username)
      if (!validation.valid) {
        return {
          ok: false,
          error: { code: 'INVALID_USERNAME', message: validation.error! },
        }
      }

      // 利用可能性チェック
      const availabilityResult = await checkUsernameAvailability(input.username)
      if (!availabilityResult.ok) {
        return availabilityResult as SocialResult<PublicUserInfo>
      }
      if (!availabilityResult.value.available) {
        return {
          ok: false,
          error: { code: 'USERNAME_TAKEN', message: 'このユーザーIDは既に使用されています' },
        }
      }
    }

    // displayNameのバリデーション
    if (input.displayName !== undefined) {
      const displayNameValidation = validateDisplayName(input.displayName)
      if (!displayNameValidation.valid) {
        return {
          ok: false,
          error: { code: 'INVALID_DISPLAY_NAME', message: displayNameValidation.error! },
        }
      }
    }

    // 更新データを構築
    const updateData: Record<string, string> = {}
    if (input.displayName !== undefined) {
      // サニタイズして保存
      updateData.display_name = sanitizeDisplayName(input.displayName)
    }
    if (input.username !== undefined) {
      updateData.username = input.username
    }

    if (Object.keys(updateData).length === 0) {
      // 更新するものがない場合は現在のプロフィールを返す
      return getProfileById(userData.user.id)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userData.user.id)
      .select('id, username, display_name, avatar_url')
      .single()

    if (error) {
      // ユニーク制約違反の場合
      if (error.code === '23505') {
        return {
          ok: false,
          error: createSafeError('USERNAME_TAKEN'),
        }
      }
      logger.error('プロフィール更新失敗', error)
      return {
        ok: false,
        error: createSafeError('DB_ERROR', error),
      }
    }

    return {
      ok: true,
      value: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createSafeError('DB_ERROR', error),
    }
  }
}
