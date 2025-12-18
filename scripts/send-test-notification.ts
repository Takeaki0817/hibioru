// テスト通知送信スクリプト
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const vapidPublicKey = 'BCpexeci4sdoLC-c5Lc0BmL-qQ7C_PRgfiEKlowSxETRJti5kZsWIN_Po_yh2P9N9dpFdiHkRBkXq4keWBkij_A'
const vapidPrivateKey = 'pejnWEyR7heOdDacEracwKSuZS0P1FVGyLxQOiDVsVc'

webpush.setVapidDetails(
  'mailto:test@hibioru.app',
  vapidPublicKey,
  vapidPrivateKey
)

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching subscriptions:', error)
    process.exit(1)
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No subscriptions found in database')
    process.exit(0)
  }

  const sub = subscriptions[0]
  console.log('Sending to:', sub.endpoint.substring(0, 60) + '...')

  const payload = JSON.stringify({
    title: 'テスト通知',
    body: 'ヒビオルからのテスト通知です',
    data: { url: '/timeline', type: 'test' }
  })

  try {
    await webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }, payload)
    console.log('Notification sent successfully!')
  } catch (err) {
    console.error('Failed to send:', (err as Error).message)
  }
}

main()
