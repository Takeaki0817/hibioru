/**
 * Stripe Customer Portal設定スクリプト
 * 月額↔年額のプラン変更を有効化
 */
import { config } from 'dotenv'
// .env.local を優先的に読み込み
config({ path: '.env.local' })
config({ path: '.env' })
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY が設定されていません')
  console.error('   .env.local に STRIPE_SECRET_KEY を設定してください')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
})

async function configureCustomerPortal() {
  const PRODUCT_ID = 'prod_Tl5sm00ThR197n' // ヒビオル プレミアム
  const PRICE_MONTHLY = 'price_1SnZgWEmRaIgypFemVRnjuVX'
  const PRICE_YEARLY = 'price_1SnZgWEmRaIgypFeelO8oI01'

  try {
    // 既存の設定を確認
    const existingConfigs = await stripe.billingPortal.configurations.list({ limit: 1 })
    
    const configData: Stripe.BillingPortal.ConfigurationCreateParams = {
      business_profile: {
        headline: 'ヒビオル - プラン管理',
      },
      features: {
        // サブスクリプション更新（プラン変更）を有効化
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          products: [
            {
              product: PRODUCT_ID,
              prices: [PRICE_MONTHLY, PRICE_YEARLY],
            },
          ],
          proration_behavior: 'create_prorations', // 日割り計算
        },
        // サブスクリプションキャンセルを有効化
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end', // 期間終了時にキャンセル
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        // 支払い方法の更新を有効化
        payment_method_update: {
          enabled: true,
        },
        // 請求履歴の表示を有効化
        invoice_history: {
          enabled: true,
        },
      },
    }

    let config: Stripe.BillingPortal.Configuration

    if (existingConfigs.data.length > 0) {
      // 既存設定を更新
      const existingId = existingConfigs.data[0].id
      config = await stripe.billingPortal.configurations.update(existingId, configData)
      console.log('✅ Customer Portal設定を更新しました:', config.id)
    } else {
      // 新規作成
      config = await stripe.billingPortal.configurations.create(configData)
      console.log('✅ Customer Portal設定を作成しました:', config.id)
    }

    console.log('\n設定内容:')
    console.log('- プラン変更:', config.features.subscription_update.enabled ? '有効' : '無効')
    console.log('- キャンセル:', config.features.subscription_cancel.enabled ? '有効' : '無効')
    console.log('- 支払い方法更新:', config.features.payment_method_update.enabled ? '有効' : '無効')
    console.log('- 請求履歴:', config.features.invoice_history.enabled ? '有効' : '無効')

  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

configureCustomerPortal()
