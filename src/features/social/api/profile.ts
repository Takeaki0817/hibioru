'use server'

import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/e2e-auth'
import { authActionClient } from '@/lib/safe-action'
import { logger } from '@/lib/logger'
import { createSafeError } from '@/lib/error-handler'
import { rateLimits, checkRateLimit, getRateLimitErrorMessage } from '@/lib/rate-limit'
import type { PublicUserInfo, SocialResult } from '../types'
import {
  validateUsername,
  validateDisplayName,
  sanitizeDisplayName,
} from '../constants'

// 入力スキーマ
const checkUsernameSchema = z.object({
  username: z.string().min(1),
})

const updateProfileSchema = z.object({
  username: z.string().optional(),
  displayName: z.string().optional(),
})

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
 * 認証後、単一のDBクエリでプロフィールを取得（最適化済み）
 */
export async function getMyProfile(): Promise<SocialResult<PublicUserInfo>> {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // Single DB call instead of calling getProfileById
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
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
 * ユーザー名の利用可能性をチェック（内部ユーティリティ）
 */
async function checkUsernameAvailabilityInternal(
  userId: string,
  username: string
): Promise<{ available: boolean } | null> {
  const supabase = await createClient()

  // 自分以外で同じusernameを持つユーザーがいるかチェック
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', userId)
    .maybeSingle()

  if (error) {
    logger.error('ユーザー名重複チェック失敗', error)
    return null
  }

  return { available: data === null }
}

/**
 * ユーザー名の利用可能性をチェック
 */
export const checkUsernameAvailability = authActionClient
  .inputSchema(checkUsernameSchema)
  .action(async ({ parsedInput: { username }, ctx: { user } }) => {
    // バリデーション
    const validation = validateUsername(username)
    if (!validation.valid) {
      throw new Error(validation.error!)
    }

    const result = await checkUsernameAvailabilityInternal(user.id, username)
    if (result === null) {
      throw new Error('確認中にエラーが発生しました')
    }

    return result
  })

/**
 * プロフィールを更新
 */
export const updateProfile = authActionClient
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput: input, ctx: { user, supabase } }) => {
    // レート制限チェック
    const rateCheck = await checkRateLimit(rateLimits.profileUpdate, user.id)
    if (!rateCheck.success) {
      throw new Error(getRateLimitErrorMessage(rateCheck.resetAt))
    }

    // usernameが指定されている場合はバリデーション
    if (input.username) {
      const validation = validateUsername(input.username)
      if (!validation.valid) {
        throw new Error(validation.error!)
      }

      // 利用可能性チェック
      const availabilityResult = await checkUsernameAvailabilityInternal(user.id, input.username)
      if (availabilityResult === null) {
        throw new Error('ユーザー名の確認に失敗しました')
      }
      if (!availabilityResult.available) {
        throw new Error('このユーザーIDは既に使用されています')
      }
    }

    // displayNameのバリデーション
    if (input.displayName !== undefined) {
      const displayNameValidation = validateDisplayName(input.displayName)
      if (!displayNameValidation.valid) {
        throw new Error(displayNameValidation.error!)
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
      // 更新するものがない場合は現在のプロフィールを取得して返す
      const profileResult = await getProfileById(user.id)
      if (!profileResult.ok) {
        throw new Error('プロフィールの取得に失敗しました')
      }
      return profileResult.value
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, username, display_name, avatar_url')
      .single()

    if (error) {
      // ユニーク制約違反の場合
      if (error.code === '23505') {
        throw new Error('このユーザーIDは既に使用されています')
      }
      logger.error('プロフィール更新失敗', error)
      throw new Error('プロフィールの更新に失敗しました')
    }

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
    } as PublicUserInfo
  })
