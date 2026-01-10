import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import {
  getPlanTypeFromPriceId,
  isValidHotsurePurchase,
  HOTSURE_PACK_QUANTITY,
} from '@/features/billing/constants'

// 遅延初期化（ビルド時のエラー回避）
function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(supabase, stripe, session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        if (paymentIntent.metadata.type === 'hotsure_purchase') {
          await handleHotsurePurchase(supabase, paymentIntent)
        }
        break
      }

      default:
        // 未対応のイベントは無視
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook handler error', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Checkout完了時の処理
 */
async function handleCheckoutComplete(
  supabase: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  // ほつれ購入の場合は別処理
  if (session.mode === 'payment') {
    return
  }

  const userId = session.metadata?.user_id

  if (!userId) {
    logger.warn('Missing user_id in checkout session metadata', { sessionId: session.id })
    return
  }

  // サブスクリプション情報を取得
  const subscriptionId = session.subscription as string
  if (!subscriptionId) {
    logger.warn('Missing subscription in checkout session', { sessionId: session.id })
    return
  }

  const subscription = (await stripe.subscriptions.retrieve(
    subscriptionId
  )) as Stripe.Subscription

  const firstItem = subscription.items.data[0]
  const stripePriceId = firstItem?.price.id

  if (!stripePriceId) {
    logger.warn('Missing price ID in subscription', { subscriptionId })
    return
  }

  // メタデータではなくStripe Price IDからプランタイプを判定
  const planType = getPlanTypeFromPriceId(stripePriceId)

  if (!planType) {
    logger.error('Invalid price ID in subscription', {
      subscriptionId,
      stripePriceId,
    })
    return
  }

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
      plan_type: planType,
      status: subscription.status,
      current_period_start: firstItem
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
      current_period_end: firstItem
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    logger.error('Failed to update subscription after checkout', error)
    throw error
  }

  logger.info('Subscription created', { userId, planType })
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const firstItem = subscription.items.data[0]
  const stripePriceId = firstItem?.price.id

  // プラン変更時のplan_type更新
  const planType = stripePriceId ? getPlanTypeFromPriceId(stripePriceId) : null

  // キャンセル日時の決定:
  // - 即時キャンセル: canceled_at が設定される
  // - 期間終了時キャンセル: cancel_at が設定される（canceled_at は null）
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      // プラン変更時にprice_idとplan_typeも更新
      ...(stripePriceId && { stripe_price_id: stripePriceId }),
      ...(planType && { plan_type: planType }),
      current_period_start: firstItem
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
      current_period_end: firstItem
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
      canceled_at: canceledAt,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error('Failed to update subscription', error)
    throw error
  }

  logger.info('Subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
    planType,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt,
  })
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_type: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error('Failed to delete subscription', error)
    throw error
  }

  logger.info('Subscription deleted', { subscriptionId: subscription.id })
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // 支払い失敗時の通知処理（将来的に実装）
  logger.warn('Payment failed', {
    customerId: invoice.customer,
    invoiceId: invoice.id,
  })
}

/**
 * ほつれ購入完了時の処理
 */
async function handleHotsurePurchase(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const userId = paymentIntent.metadata.user_id
  const metadataQuantity = parseInt(paymentIntent.metadata.quantity || '2', 10)

  if (!userId) {
    logger.warn('Missing user_id in hotsure purchase', {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  // 支払額と数量の整合性を検証
  if (!isValidHotsurePurchase(paymentIntent.amount, metadataQuantity)) {
    logger.error('Invalid hotsure purchase: amount and quantity mismatch', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      metadataQuantity,
    })
    return
  }

  // 検証済みの数量を使用（メタデータではなくデフォルト値を使用）
  const quantity = HOTSURE_PACK_QUANTITY

  // 購入履歴を作成
  const { error: purchaseError } = await supabase.from('hotsure_purchases').insert({
    user_id: userId,
    stripe_payment_intent_id: paymentIntent.id,
    quantity,
    amount: paymentIntent.amount,
    status: 'completed',
  })

  if (purchaseError) {
    logger.error('Failed to create hotsure purchase record', purchaseError)
    throw purchaseError
  }

  // bonus_hotsureを加算
  const { data: currentStreak, error: fetchError } = await supabase
    .from('streaks')
    .select('bonus_hotsure')
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    logger.error('Failed to fetch current bonus_hotsure', fetchError)
    throw fetchError
  }

  const newBonusHotsure = (currentStreak?.bonus_hotsure ?? 0) + quantity

  const { error: updateError } = await supabase
    .from('streaks')
    .update({ bonus_hotsure: newBonusHotsure })
    .eq('user_id', userId)

  if (updateError) {
    logger.error('Failed to update bonus_hotsure', updateError)
    throw updateError
  }

  logger.info('Hotsure purchase completed', { userId, quantity, newBonusHotsure })
}
