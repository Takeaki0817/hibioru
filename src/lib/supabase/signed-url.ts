'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { SIGNED_URL_CONFIG, extractPathFromUrl } from './storage-utils'

/**
 * 署名付きURLを生成（サーバーサイド専用）
 *
 * @param imagePath - ファイルパス（"user-id/filename.webp"形式）
 * @param useServiceRole - サービスロールを使用するか（他ユーザーの画像アクセス用）
 * @returns 署名付きURL、または失敗時はnull
 */
export async function generateSignedUrl(
  imagePath: string,
  useServiceRole = false
): Promise<string | null> {
  try {
    if (useServiceRole) {
      // サービスロールでアクセス（他ユーザーの共有画像用）
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        logger.error('Supabase環境変数が設定されていません')
        return null
      }

      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
      const { data, error } = await adminClient.storage
        .from('entry-images')
        .createSignedUrl(imagePath, SIGNED_URL_CONFIG.EXPIRY_SECONDS)

      if (error) {
        logger.error('署名付きURL生成失敗（admin）', error)
        return null
      }

      return data.signedUrl
    } else {
      // 通常のサーバークライアントでアクセス（自分の画像用）
      const supabase = await createServerClient()
      const { data, error } = await supabase.storage
        .from('entry-images')
        .createSignedUrl(imagePath, SIGNED_URL_CONFIG.EXPIRY_SECONDS)

      if (error) {
        logger.error('署名付きURL生成失敗', error)
        return null
      }

      return data.signedUrl
    }
  } catch (error) {
    logger.error('署名付きURL生成でエラー', error)
    return null
  }
}

/**
 * 画像URL配列を署名付きURLに変換
 *
 * @param imageUrls - 画像URLの配列（公開URLまたはパス）
 * @param currentUserId - 現在のユーザーID
 * @param entryOwnerId - エントリの所有者ID
 * @returns 署名付きURLの配列
 */
export async function transformToSignedUrls(
  imageUrls: string[] | null,
  currentUserId: string | null,
  entryOwnerId: string
): Promise<string[] | null> {
  if (!imageUrls || imageUrls.length === 0) {
    return null
  }

  // 自分のエントリかどうか
  const isOwner = currentUserId === entryOwnerId
  // 他ユーザーの画像にはサービスロールを使用
  const useServiceRole = !isOwner

  const signedUrls = await Promise.all(
    imageUrls.map(async (url) => {
      // 既に署名付きURLの場合はそのまま返す
      if (url.includes('token=')) {
        return url
      }

      // パスを抽出（公開URLの場合）
      const path = extractPathFromUrl(url) ?? url

      // 署名付きURLを生成
      const signedUrl = await generateSignedUrl(path, useServiceRole)
      return signedUrl ?? url // 失敗時は元のURLを返す
    })
  )

  return signedUrls
}
