/**
 * VAPID鍵生成スクリプト
 *
 * Web Push通知に必要なVAPID鍵ペアを生成します。
 * 生成された鍵は環境変数として設定してください。
 *
 * 使用方法:
 *   pnpm vapid:generate
 *
 * 出力される環境変数:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY - クライアントサイドで使用（公開鍵）
 *     - Service Workerでのプッシュ購読登録時に使用
 *     - 公開可能（NEXT_PUBLIC_プレフィックス）
 *
 *   VAPID_PRIVATE_KEY - サーバーサイドで使用（秘密鍵）
 *     - Next.js API RoutesおよびSupabase Edge Functionsで使用
 *     - 絶対に公開しない、.envファイルに記載しgitignoreで除外
 *
 * 設定先:
 *   - ローカル開発: .env.local
 *   - 本番環境: Vercel環境変数 + Supabase Secret
 *
 * 参照:
 *   - web-push: https://www.npmjs.com/package/web-push
 *   - VAPID: https://datatracker.ietf.org/doc/html/rfc8292
 */

async function generateVapidKeys() {
  try {
    // web-pushパッケージを動的にインポート
    const webpushModule = await import('web-push');
    // ESMインポートの場合、defaultプロパティにモジュールが格納される場合がある
    const webpush = webpushModule.default || webpushModule;

    console.log('VAPID鍵ペアを生成中...\n');

    const vapidKeys = webpush.generateVAPIDKeys();

    console.log('生成完了！以下の環境変数を設定してください:\n');

    console.log('='.repeat(60));
    console.log('1. ローカル開発環境 (.env.local に追加)');
    console.log('='.repeat(60));
    console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

    console.log('\n' + '='.repeat(60));
    console.log('2. Vercel本番環境 (Settings > Environment Variables)');
    console.log('='.repeat(60));
    console.log('Name: NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    console.log(`Value: ${vapidKeys.publicKey}`);
    console.log('');
    console.log('Name: VAPID_PRIVATE_KEY');
    console.log(`Value: ${vapidKeys.privateKey}`);

    console.log('\n' + '='.repeat(60));
    console.log('3. Supabase Edge Functions (Secrets)');
    console.log('='.repeat(60));
    console.log('以下のコマンドで設定:');
    console.log(`  supabase secrets set VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`  supabase secrets set VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    console.log('');
    console.log('または Supabase Dashboard > Project Settings > Secrets で設定');

    console.log('\n' + '='.repeat(60));
    console.log('重要な注意事項');
    console.log('='.repeat(60));
    console.log('- VAPID_PRIVATE_KEYは秘密鍵です。絶対に公開しないでください！');
    console.log('- 鍵を紛失すると全ユーザーの購読情報が無効になります。');
    console.log('- 鍵は一度生成したら変更しないでください。');
    console.log('- .env.localは.gitignoreに含まれていることを確認してください。\n');

  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('web-pushパッケージがインストールされていません。');
      console.error('\n以下のコマンドでインストールしてください:');
      console.error('  pnpm add -D web-push\n');
    } else {
      console.error('エラーが発生しました:', error);
    }
    process.exit(1);
  }
}

// スクリプト実行
generateVapidKeys();
