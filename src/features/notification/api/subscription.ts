/**
 * 購読管理サービス (PushSubscriptionService)
 *
 * Web Push購読情報の登録・取得・削除を管理します。
 * 複数デバイスの購読情報をサポートし、無効なエンドポイントの自動削除も行います。
 *
 * 注: 実装は lib/push/subscription.ts に移動しました。
 * このファイルは後方互換性のために再exportを提供します。
 */

// 共有ライブラリから再export（後方互換性のため）
export {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
  type PushSubscription,
  type PushSubscriptionInput,
  type SubscriptionError,
} from '@/lib/push/subscription'
