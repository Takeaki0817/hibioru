/**
 * VAPID鍵生成スクリプト
 *
 * Web Push通知に必要なVAPID鍵ペアを生成します。
 * 生成された鍵は環境変数として設定してください。
 *
 * 使用方法:
 *   pnpm add -D web-push
 *   pnpm tsx scripts/generate-vapid-keys.ts
 *
 * 出力される環境変数:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY - クライアントサイドで使用（公開鍵）
 *   VAPID_PRIVATE_KEY - サーバーサイドで使用（秘密鍵、絶対に公開しない）
 */

async function generateVapidKeys() {
  try {
    // web-pushパッケージを動的にインポート
    const webpush = await import('web-push');

    console.log('🔑 VAPID鍵ペアを生成中...\n');

    const vapidKeys = webpush.generateVAPIDKeys();

    console.log('✅ 生成完了！以下の環境変数を設定してください:\n');
    console.log('--- .env.local に追加 ---');
    console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    console.log('\n--- Vercelの環境変数に追加 ---');
    console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY: ${vapidKeys.privateKey}`);
    console.log('\n⚠️  VAPID_PRIVATE_KEYは秘密鍵です。絶対に公開しないでください！');
    console.log('⚠️  鍵を紛失すると全ユーザーの購読情報が無効になります。安全に保管してください。\n');

  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('❌ web-pushパッケージがインストールされていません。');
      console.error('\n以下のコマンドでインストールしてください:');
      console.error('  pnpm add -D web-push');
      console.error('  pnpm add -D tsx  # TypeScriptスクリプト実行用\n');
    } else {
      console.error('❌ エラーが発生しました:', error);
    }
    process.exit(1);
  }
}

// スクリプト実行
generateVapidKeys();
