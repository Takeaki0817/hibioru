# テストシナリオ: auth

## 概要

Google OAuth認証機能のテストシナリオを定義する。要件書（Requirements）と設計書（Design）に基づき、ユニットテスト・統合テスト・E2Eテストの観点をカバー。

**実装対象ファイル**:
- API層: `src/features/auth/api/actions.ts`
- ストア層: `src/features/auth/stores/auth-store.ts`
- エラー処理: `src/features/auth/errors.ts`
- UI層: `src/app/(login)/page.tsx`
- ルーティング: `src/app/auth/callback/route.ts`, `middleware.ts`

---

## ユニットテスト

### API関数（Server Actions）

| # | テスト名 | 対象関数 | テスト内容 | 優先度 |
|---|---------|---------|-----------|--------|
| 1 | signOut成功時のリダイレクト | `signOut` | ログアウト処理が正常に完了し、`/` へリダイレクトされること | 高 |
| 2 | signOut時のセッションクリア | `signOut` | ログアウト後、Supabaseセッションがクリアされること | 高 |
| 3 | getCurrentUser認証済み | `getCurrentUser` | 認証済みユーザーの情報が正しく取得されること | 高 |
| 4 | getCurrentUser未認証 | `getCurrentUser` | 未認証の場合、`null` が返されること | 高 |
| 5 | deleteAccount成功時の全削除 | `deleteAccount` | ユーザー、Storage内のファイル、関連データが削除されること | 高 |
| 6 | deleteAccount_Storage削除失敗時の動作 | `deleteAccount` | Storage削除エラーを`logger.warn`で記録し、処理が続行されること | 中 |
| 7 | deleteAccount_Auth削除失敗時のエラー | `deleteAccount` | Supabase Auth削除失敗時にエラーがスロー される | 高 |
| 8 | deleteAccount_削除後のセッションクリア | `deleteAccount` | ユーザー削除後、セッションがクリアされること（エラー無視） | 中 |
| 9 | deleteAccount未認証時のアクセス拒否 | `deleteAccount` | `authActionClient` 経由のため、未認証では実行不可 | 高 |

### エラーハンドリング関数

| # | テスト名 | 対象関数 | テスト内容 | 優先度 |
|---|---------|---------|-----------|--------|
| 10 | classifyAuthError_ネットワークエラー | `classifyAuthError` | `network` エラーメッセージを含むエラーが正しく分類されること | 高 |
| 11 | classifyAuthError_認証エラー | `classifyAuthError` | `auth`, `unauthorized`, `forbidden` などのエラーが正しく分類されること | 高 |
| 12 | classifyAuthError_Supabase AuthError（401） | `classifyAuthError` | `status: 401` のエラーが `auth` 型に分類されること | 高 |
| 13 | classifyAuthError_Supabase AuthError（403） | `classifyAuthError` | `status: 403` のエラーが `auth` 型に分類されること | 高 |
| 14 | classifyAuthError_予期せぬエラー | `classifyAuthError` | 分類できないエラーが `unknown` 型に分類されること | 高 |
| 15 | classifyAuthError_retryable判定 | `classifyAuthError` | すべてのエラーが `retryable: true` を持つこと | 中 |
| 16 | isNetworkError_接続失敗 | （内部） | `connection` を含むエラーがネットワークエラーと判定されること | 中 |
| 17 | isNetworkError_タイムアウト | （内部） | `timeout` を含むエラーがネットワークエラーと判定されること | 中 |
| 18 | isNetworkError_オフライン | （内部） | `offline` を含むエラーがネットワークエラーと判定されること | 中 |
| 19 | isAuthError_認可エラー | （内部） | `forbidden` を含むエラーが認証エラーと判定されること | 中 |
| 20 | createCancelledError | `createCancelledError` | キャンセルエラーが `type: 'cancelled'`, `retryable: false` で生成されること | 低 |
| 21 | parseErrorParam_auth_failed | `parseErrorParam` | `error=auth_failed` パラメータが正しく解析されること | 中 |
| 22 | parseErrorParam_null | `parseErrorParam` | `error` パラメータがない場合、`null` が返されること | 中 |

### 状態管理（Zustand Store）

| # | テスト名 | 対象ストア | テスト内容 | 優先度 |
|---|---------|-----------|-----------|--------|
| 23 | useAuthStore初期状態 | `useAuthStore` | 初期状態が `user: null`, `isLoading: true`, `isInitialized: false` であること | 高 |
| 24 | setUser更新 | `useAuthStore` | `setUser` でユーザー情報が更新されること | 高 |
| 25 | setLoading更新 | `useAuthStore` | `setLoading` でローディング状態が更新されること | 高 |
| 26 | initialize初期化 | `useAuthStore` | `initialize` で `isLoading: false`, `isInitialized: true` に設定されること | 高 |
| 27 | reset リセット動作 | `useAuthStore` | `reset` で初期状態にリセットされること（ただし `isInitialized: true` を維持） | 高 |
| 28 | selectIsAuthenticated_認証済み | `selectIsAuthenticated` | 認証済みユーザーの場合 `true` を返すこと | 高 |
| 29 | selectIsAuthenticated_未認証 | `selectIsAuthenticated` | 未認証の場合 `false` を返すこと | 高 |
| 30 | selectIsAuthenticated_初期化前 | `selectIsAuthenticated` | 初期化前は `false` を返すこと | 高 |
| 31 | selectUserId_存在 | `selectUserId` | ユーザーIDが存在する場合、そのIDを返すこと | 高 |
| 32 | selectUserId_null | `selectUserId` | ユーザーが `null` の場合、`undefined` を返すこと | 高 |

---

## 統合テスト

### ルーティング・Callback処理

| # | テスト名 | 対象コンポーネント | テスト内容 | 優先度 |
|---|---------|------------------|-----------|--------|
| 33 | callback_認証コード交換成功 | `route.ts` | 認証コードが正しくセッションに交換されること | 高 |
| 34 | callback_nextパラメータでリダイレクト | `route.ts` | `next` パラメータが指定されている場合、そのパスにリダイレクトされること | 高 |
| 35 | callback_nextパラメータ未指定時の動作 | `route.ts` | `next` が指定されていない場合、`/timeline` にリダイレクトされること | 高 |
| 36 | callback_認証キャンセル時 | `route.ts` | `error=access_denied` の場合、メッセージなしで `/` にリダイレクトされること | 高 |
| 37 | callback_error_descriptionがcancelを含む場合 | `route.ts` | `error_description` に `cancel` を含む場合、`/` にリダイレクトされること | 高 |
| 38 | callback_その他エラー時 | `route.ts` | `error=auth_failed` パラメータ付きで `/` にリダイレクトされること | 高 |
| 39 | callback_コード未指定時 | `route.ts` | コードが指定されていない場合、`/` にエラーパラメータ付きでリダイレクトされること | 高 |

### Middleware・ルート保護

| # | テスト名 | 対象レイヤー | テスト内容 | 優先度 |
|---|---------|------------|-----------|--------|
| 40 | middleware_未認証ユーザーの保護ページアクセス | `middleware.ts` | 未認証ユーザーが `/timeline` などにアクセスした場合、`/` にリダイレクトされること | 高 |
| 41 | middleware_認証済みユーザーのページアクセス | `middleware.ts` | 認証済みユーザーが保護ページにアクセスできること | 高 |
| 42 | middleware_認証済みユーザーの公開ページアクセス | `middleware.ts` | 認証済みユーザーが `/lp` や `/docs` などの公開ページにアクセスできること | 高 |
| 43 | middleware_認証済みユーザーのログインページアクセス | `middleware.ts` | 認証済みユーザーが `/` にアクセスした場合、`/timeline` にリダイレクトされること | 高 |
| 44 | middleware_セッション更新・リフレッシュ | `middleware.ts` | Middlewareが `getUser()` を呼び出し、セッションをリフレッシュすること | 高 |
| 45 | middleware_E2Eテスト環境バイパス | `middleware.ts` | `E2E_TEST_MODE=true` かつ `e2e-test-user-id` クッキーが存在する場合、認証をバイパスすること | 中 |
| 46 | middleware_E2Eテスト環境での認証済み判定 | `middleware.ts` | テスト環境では保護ページへのアクセスが許可されること | 中 |
| 47 | middleware_E2Eテスト環境でのログインページリダイレクト | `middleware.ts` | テスト環境でテストユーザーが `/` にアクセスした場合、`/timeline` にリダイレクトされること | 中 |

### ログインフロー統合

| # | テスト名 | 対象コンポーネント | テスト内容 | 優先度 |
|---|---------|------------------|-----------|--------|
| 48 | login_ページ読み込み | `page.tsx` | ログインページが正常に読み込まれること | 高 |
| 49 | login_エラーパラメータからのエラー表示 | `page.tsx` | `?error=auth_failed` パラメータでエラーが表示されること | 高 |
| 50 | login_GoogleOAuth呼び出し | `page.tsx` | Googleログインボタンクリック時に `signInWithOAuth` が正しく呼び出されること | 高 |
| 51 | login_ローディング状態の管理 | `page.tsx` | ボタンクリック時から認証完了まで、ローディング状態が正しく管理されること | 高 |
| 52 | login_エラーハンドリング | `page.tsx` | OAuth処理中のエラーが `classifyAuthError` で分類されること | 高 |
| 53 | login_再試行ボタン動作 | `page.tsx` | 「もう一度試す」ボタンでエラーがクリアされること | 中 |
| 54 | login_redirectToパラメータ | `page.tsx` | 認証リダイレクト時に正しい `redirectTo` URLが指定されること | 高 |

---

## E2Eテスト

### 正常系フロー

| # | テスト名 | ステップ | 期待結果 | 優先度 |
|---|---------|---------|---------|--------|
| 55 | ログインページ表示 | 1. `/` にアクセス | ログインページが表示されること | 高 |
| 56 | Googleログインボタン表示 | 1. `/` にアクセス | Googleログインボタンが表示されること | 高 |
| 57 | サービス名・キャッチコピー表示 | 1. `/` にアクセス | 「日々を織る」と説明文が表示されること | 高 |
| 58 | Googleログインフロー（Mock） | 1. ログインボタンクリック 2. Google認証フロー 3. `/auth/callback?code=xxx` にリダイレクト | `/timeline` に遷移し、タイムラインが表示されること | 高 |
| 59 | ログアウト処理 | 1. 認証済み状態で操作 2. ログアウトボタンクリック | `/` にリダイレクトされること | 高 |
| 60 | ログアウト後のページアクセス制限 | 1. ログアウト実行 2. `/timeline` にアクセス | `/` にリダイレクトされること | 高 |

### 異常系フロー

| # | テスト名 | ステップ | 期待結果 | 優先度 |
|---|---------|---------|---------|--------|
| 61 | 認証キャンセル時 | 1. Googleログイン開始 2. ユーザーがキャンセル | ログインページに戻ること（エラーメッセージなし） | 高 |
| 62 | Google認証エラー | 1. Googleログイン開始 2. 認証エラー発生 | エラーメッセージ「ログインできませんでした。もう一度お試しください。」が表示されること | 高 |
| 63 | ネットワークエラー時 | 1. ログインボタンクリック 2. ネットワークが切断 | エラーメッセージ「ネットワークに接続できませんでした...」が表示されること | 高 |
| 64 | エラーメッセージの再試行ボタン | 1. エラー発生 2. 「もう一度試す」をクリック | エラーメッセージが消え、再度ログインできること | 中 |
| 65 | 無効な認証コード | 1. 無効なコード付きで `/auth/callback` にアクセス | `?error=auth_failed` パラメータでエラー画面が表示されること | 中 |

### 境界値・エッジケース

| # | テスト名 | ステップ | 期待結果 | 優先度 |
|---|---------|---------|---------|--------|
| 66 | 初回ログイン時のユーザー作成 | 1. 新規Googleアカウントでログイン | 新規ユーザーレコードが `users` テーブルに作成されること | 高 |
| 67 | 既存ユーザーでのログイン | 1. 既存Googleアカウントでログイン | 既存レコードが使用され、重複が作成されないこと | 高 |
| 68 | アカウント削除フロー | 1. 認証済み状態 2. マイページ > アカウント削除 3. 確認モーダルで「delete」と入力 | ユーザーと関連データが削除され、`/` にリダイレクトされること | 高 |
| 69 | アカウント削除_確認入力エラー | 1. 削除確認モーダル 2. 「delete」以外を入力 | エラーメッセージが表示され、削除されないこと | 高 |
| 70 | リダイレクトURL保持 | 1. `/timeline` にアクセス（未認証） 2. `/` にリダイレクト 3. ログイン実行 | ログイン後、元の `/timeline` にリダイレクトされること（未実装） | 低 |
| 71 | 連続ログイン試行 | 1. ログインボタンを複数回クリック | ボタンが disabled 状態になり、1回のリクエストのみ実行されること | 中 |
| 72 | 認証完了中のページ遷移 | 1. ログイン実行中 2. ブラウザバックボタン | ログイン処理がキャンセルされ、ログインページに戻ること | 中 |
| 73 | Supabase Auth トークン期限切れ | 1. セッション有効期限切れが発生 2. ページアクセス | Middlewareでトークン更新が試みられること | 中 |
| 74 | Storage削除エラー | 1. アカウント削除実行 2. Storage削除がエラー | 警告ログが記録され、ユーザー削除は続行されること | 低 |
| 75 | 複数タブでの認証状態同期 | 1. タブAでログイン 2. タブBで保護ページアクセス | 両タブで認証済み状態が同期されること | 中 |

---

## テスト実装の優先順位

### Phase 1（必須・高優先度）
- **ユニットテスト**: 1-9（API関数）、10-22（エラーハンドリング）、23-32（ストア）
- **統合テスト**: 33-39（Callback）、40-47（Middleware）
- **E2Eテスト**: 55-67（基本フロー・初回ログイン・既存ユーザー）

### Phase 2（推奨・中優先度）
- **ユニットテスト**: 特になし（Phase 1ですべてカバー）
- **E2Eテスト**: 62-75（異常系・エッジケース）

### Phase 3（オプション・低優先度）
- **E2Eテスト**: 70（リダイレクトURL保持 - 未実装機能）

---

## テスト実装上の注意事項

### Mocking戦略

1. **Supabase Auth Mock**:
   ```typescript
   jest.mock('@/lib/supabase/client', () => ({
     createClient: jest.fn(() => ({
       auth: {
         signInWithOAuth: jest.fn(),
         signOut: jest.fn(),
         getUser: jest.fn(),
       },
     })),
   }))
   ```

2. **E2E環境での実Supabase使用**:
   - テストアカウントを作成し、実際のGoogle OAuth フローをシミュレート
   - または Supabase Emulator を使用

3. **Middleware テスト**:
   - `NextRequest` / `NextResponse` をモック
   - `cookies()` の読み書きをシミュレート

### テストデータ・Fixtures

| Fixture | 用途 | ファイル |
|---------|------|--------|
| テストユーザー | E2Eテストでのログイン | `e2e/fixtures/test-helpers.ts` |
| テスト用Googleアカウント | 実Google OAuth テスト | `.env.test.local` |
| モックSessions | Session 交換テスト | ユニットテスト内 |

### フレーキネス対策

1. **タイムアウト設定**:
   - Google OAuth: `timeout: 30000` ms
   - Callback処理: `timeout: 10000` ms

2. **リトライ設定**:
   - ネットワークエラー: 最大2回リトライ
   - 環境依存テスト: CI環境では跳過

3. **待機戦略**:
   - `waitForNavigation()` でリダイレクト完了を待機
   - `waitForSelector()` でUI要素の出現を確認

---

## カバレッジ目標

| レイヤー | カバレッジ目標 | 重点 |
|---------|--------------|------|
| API層（actions.ts） | 100% | signOut, deleteAccount, getCurrentUser |
| エラー処理（errors.ts） | 100% | classifyAuthError の全分岐 |
| ストア層（auth-store.ts） | 100% | すべての setter / selector |
| Callback（route.ts） | 100% | 全リダイレクトパターン |
| Middleware（middleware.ts） | 90%+ | 保護ロジック、セッション更新 |
| UI層（page.tsx） | 80%+ | ボタンクリック、エラー表示（OAuth部分はE2Eで) |

---

## 参照資料

| 資料 | 場所 |
|------|------|
| 要件書 | `.kiro/specs/auth/requirements.md` |
| 設計書 | `.kiro/specs/auth/design.md` |
| ギャップ分析 | `docs/test-reconstruction/gap-analysis-auth.md` |
| テスト規約 | `.claude/rules/testing.md` |
| E2E戦略 | `.claude/rules/e2e-strategy.md` |
