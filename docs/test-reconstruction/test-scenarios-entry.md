# テストシナリオ: entry

## 概要

- **対象機能**: entry（エントリー作成・編集・削除）
- **作成日**: 2026-01-17
- **関連ファイル**: `src/features/entry/`
- **参考**: `.kiro/specs/entry/`, `gap-analysis-entry.md`

## 重要なギャップ（テスト時に考慮）

| ギャップ | 仕様 | 実装 | テスト対象 |
|---------|------|------|-----------|
| 日次投稿制限 | 20件/日 | 15件/日 | **実装値 15 を基準にテスト** |
| 画像添付制限 | 5枚/日 | 5枚/月 | **実装値（月単位）を基準にテスト** |
| 下書き保存 | 作成・編集両モード | 作成モードのみ | **作成モードのみテスト** |
| isShared機能 | 仕様未記載 | 実装済み | **実装仕様に基づいてテスト** |

---

## ユニットテスト

### API関数（actions.ts, service.ts）

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| createEntry正常系 | `createEntry()` | 有効な入力でエントリを作成、Entryを返却 | 高 |
| createEntry空白コンテンツ | `createEntry()` | コンテンツが空白のみ→BusinessLogicError | 高 |
| createEntry日次投稿制限超過 | `createEntry()` | 15件/日の制限に達した状態→制限エラー | 高 |
| createEntry画像制限超過 | `createEntry()` | 月の画像上限に達した→制限エラー | 高 |
| createEntry認証チェック | `createEntry()` | 認証されていないユーザー→UNAUTHORIZEDエラー | 高 |
| createEntryレート制限 | `createEntry()` | 短時間で複数呼び出し→レート制限エラー | 中 |
| createEntry副作用成功 | `createEntry()` | updateStreakOnEntry, handleEntryCreated, checkAndCreateAchievements が Promise.allSettled で実行 | 中 |
| updateEntry正常系 | `updateEntry()` | 有効な入力でエントリを更新 | 高 |
| updateEntry権限チェック | `updateEntry()` | 自分のエントリ以外→FORBIDDEN | 高 |
| updateEntry編集期限切れ | `updateEntry()` | 24時間以上経過→EDIT_EXPIRED | 高 |
| updateEntry共有状態変更（非→共有） | `updateEntry()` | isShared: false→true: achievementsレコード作成 | 中 |
| updateEntry共有状態変更（共有→非） | `updateEntry()` | isShared: true→false: achievementsレコード削除 | 中 |
| updateEntry共有状態維持編集 | `updateEntry()` | isShared両方true: touchSharedEntryAchievement() 実行 | 中 |
| deleteEntry正常系 | `deleteEntry()` | 存在するエントリを論理削除、is_deleted=true | 高 |
| deleteEntry権限チェック | `deleteEntry()` | 自分のエントリ以外→FORBIDDEN | 高 |
| deleteEntry共有投稿 | `deleteEntry()` | is_shared=true→achievementsレコード削除 | 中 |
| getEntry正常系 | `getEntry()` | 存在するエントリを取得 | 中 |
| getEntry削除済み | `getEntry()` | is_deleted=true のエントリ→NOT_FOUND | 中 |
| getEntry未存在 | `getEntry()` | 存在しないID→NOT_FOUND | 中 |

### 日次制限チェック（daily-limits.ts）

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| getDailyEntryCount正常系 | `getDailyEntryCount()` | 当日（JST）のエントリ数を取得 | 高 |
| getDailyEntryCountDB失敗 | `getDailyEntryCount()` | DB接続エラー→0を返す | 中 |
| checkDailyEntryLimit制限内 | `checkDailyEntryLimit()` | 当日5件、制限15件→allowed: true, remaining: 10 | 高 |
| checkDailyEntryLimit制限到達 | `checkDailyEntryLimit()` | 当日15件→allowed: false, remaining: 0 | 高 |
| checkDailyEntryLimitDB失敗 | `checkDailyEntryLimit()` | DB接続エラー→DB_ERROR | 中 |
| getDailyImageCount正常系 | `getDailyImageCount()` | 当日（JST）の画像付きエントリ数を取得 | 高 |
| checkDailyImageLimit制限内 | `checkDailyImageLimit()` | 当月3枚、制限5枚→allowed: true, remaining: 2 | 高 |
| checkDailyImageLimit制限超過 | `checkDailyImageLimit()` | 当月5枚以上→allowed: false, remaining: 0 | 高 |
| JST境界：2024-12-31 23:00JST | `checkDailyEntryLimit()` | 2024-12-31 23:00（JST）で当日カウント | 中 |
| JST境界：2025-01-01 00:00JST | `checkDailyEntryLimit()` | 2025-01-01 00:00（JST）で新しい日のカウント | 中 |

### 画像処理（image-service.ts）

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| compressImage正常系 | `compressImage()` | JPEG/PNG/WebP/GIF→200KB以下に圧縮 | 高 |
| compressImage形式チェック | `compressImage()` | BMP等の非対応形式→INVALID_TYPE | 高 |
| compressImage圧縮失敗 | `compressImage()` | 圧縮エラー→COMPRESSION_FAILED | 中 |
| uploadImage正常系 | `uploadImage()` | Supabase Storageに成功→公開URL返却 | 高 |
| uploadImageファイル名 | `uploadImage()` | ファイル名が `{userId}/{timestamp}_{random}.webp` 形式 | 中 |
| uploadImageアップロード失敗 | `uploadImage()` | Storage接続エラー→UPLOAD_FAILED | 中 |
| deleteImage正常系 | `deleteImage()` | 公開URL→ファイルパス抽出→削除 | 中 |
| deleteImageURL解析失敗 | `deleteImage()` | 不正なURL形式→無視（ベストエフォート） | 低 |

### 下書き保存（draft-storage.ts）

| テスト名 | 対象関数 | テスト内容 | 優先度 |
|---------|---------|-----------|--------|
| saveDraft正常系 | `saveDraft()` | Draft オブジェクト→localStorage保存 | 高 |
| saveDraftSSR対応 | `saveDraft()` | typeof window === 'undefined' 時→処理しない | 中 |
| saveDraftストレージ満杯 | `saveDraft()` | QuotaExceededError→無視 | 低 |
| loadDraft正常系 | `loadDraft()` | localStorage→Draft オブジェクト復元 | 高 |
| loadDraftデータ無し | `loadDraft()` | キーが存在しない→null | 高 |
| loadDraftSSR対応 | `loadDraft()` | typeof window === 'undefined' 時→null | 中 |
| loadDraftJSON破損 | `loadDraft()` | JSON.parse エラー→null | 低 |
| clearDraft正常系 | `clearDraft()` | localStorage キー削除 | 中 |
| clearDraftSSR対応 | `clearDraft()` | typeof window === 'undefined' 時→処理しない | 低 |

### ストア（entry-form-store.ts）

| テスト名 | 対象ストア | テスト内容 | 優先度 |
|---------|-----------|-----------|--------|
| selectCanSubmit：コンテンツ有 | `useEntryFormStore` | content が非空白→true | 高 |
| selectCanSubmit：送信中 | `useEntryFormStore` | isSubmitting=true→false | 高 |
| selectCanSubmit：削除中 | `useEntryFormStore` | isDeleting=true→false | 高 |
| selectCanSubmit：成功後 | `useEntryFormStore` | isSuccess=true→false | 高 |
| selectTotalImageCount | `useEntryFormStore` | 新規画像2枚 + 既存3枚（1削除予定）= 4枚 | 高 |
| selectCanAddImage：制限内 | `useEntryFormStore` | 現在1枚、MAX=2→true | 高 |
| selectCanAddImage：制限到達 | `useEntryFormStore` | 現在2枚、MAX=2→false | 高 |
| addImage：正常系 | `useEntryFormStore` | CompressedImage 追加 | 中 |
| addImage：制限超過 | `useEntryFormStore` | MAX_IMAGES 到達時→追加されない | 中 |
| removeImage：URL解放 | `useEntryFormStore` | URL.revokeObjectURL() 呼び出し | 中 |
| toggleExistingImageRemoval | `useEntryFormStore` | removedImageUrls Set で追加/削除 | 中 |
| initialize：フォームリセット | `useEntryFormStore` | 初期化時に initialState に戻る | 中 |
| reset：新インスタンス作成 | `useEntryFormStore` | Set の参照が毎回新規作成 | 低 |

---

## E2Eテスト

### 正常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **投稿作成：テキストのみ** | 1. テキスト入力<br>2. 送信ボタン<br>3. サクセスオーバーレイ表示<br>4. タイムラインリダイレクト | ✓ エントリがDB保存<br>✓ サクセス画面800ms表示<br>✓ タイムラインで最新投稿が上部に表示 | 高 |
| **投稿作成：テキスト＋絵文字** | 1. テキスト入力（複数行含む）<br>2. 絵文字を挿入<br>3. 送信 | ✓ 絵文字を含む内容が保存<br>✓ タイムラインで絵文字が正しく表示 | 高 |
| **投稿作成：画像1枚添付** | 1. テキスト入力<br>2. 画像添付（JPEG）<br>3. プレビュー表示確認<br>4. 送信 | ✓ 画像が圧縮（200KB以下）<br>✓ Supabase Storageにアップロード<br>✓ image_urls に URL 保存<br>✓ タイムラインで画像表示 | 高 |
| **投稿作成：画像2枚添付** | 1. テキスト入力<br>2. 画像を2枚添付<br>3. プレビューグリッド表示<br>4. 送信 | ✓ 両方の画像が保存<br>✓ タイムラインで2枚並んで表示 | 高 |
| **投稿作成：ソーシャル共有有効** | 1. テキスト入力<br>2. "みんなで応援に追加"トグル ON<br>3. 送信 | ✓ is_shared=true で保存<br>✓ ソーシャルフィードに表示<br>✓ achievements レコード作成 | 高 |
| **投稿作成：下書き自動保存** | 1. テキスト入力（"テスト"）<br>2. 300ms待機<br>3. localStorage確認 | ✓ localStorage に Draft オブジェクト保存<br>✓ content: "テスト" 確認<br>✓ savedAt が ISO 8601 形式 | 高 |
| **投稿作成：下書きから復元** | 1. 下書き作成後ページ離脱<br>2. 投稿ページに戻る<br>3. loadDraft() で復元 | ✓ テキストが自動復元<br>✓ 下書きをクリア後は復元されない | 高 |
| **投稿作成：制限内での連続投稿** | 1. 投稿A作成<br>2. 投稿B作成<br>3. 投稿C作成（合計3件）<br>4. 残数チェック | ✓ 3件すべて保存<br>✓ remaining: 12 表示（15-3） | 高 |
| **投稿編集：コンテンツ変更** | 1. 既存投稿（24h以内）を開く<br>2. テキストを変更<br>3. 送信 | ✓ DB で新しいテキストに更新<br>✓ タイムラインで変更が反映 | 高 |
| **投稿編集：画像追加** | 1. テキストのみの投稿を開く<br>2. 画像を1枚添付<br>3. 送信 | ✓ image_urls に URL 追加<br>✓ タイムラインで画像表示 | 高 |
| **投稿編集：画像削除** | 1. 画像2枚の投稿を開く<br>2. 1枚をチェックして削除予定に<br>3. 送信 | ✓ removedImageUrls から削除<br>✓ image_urls に1枚のみ保存 | 高 |
| **投稿編集：共有状態を追加** | 1. 非共有投稿を編集<br>2. 共有トグル ON<br>3. 送信 | ✓ is_shared=true に更新<br>✓ achievements レコード作成<br>✓ ソーシャルフィードに表示 | 中 |
| **投稿編集：共有状態を解除** | 1. 共有投稿を編集<br>2. 共有トグル OFF<br>3. 送信 | ✓ is_shared=false に更新<br>✓ achievements レコード削除<br>✓ ソーシャルフィードから非表示 | 中 |
| **投稿削除：確認ダイアログ表示** | 1. 投稿の削除ボタン<br>2. ダイアログが表示 | ✓ "削除しますか？"確認<br>✓ キャンセル可能 | 高 |
| **投稿削除：論理削除実行** | 1. 削除ダイアログで確認<br>2. is_deleted確認 | ✓ is_deleted=true<br>✓ タイムラインから非表示<br>✓ DB に物理削除されない | 高 |
| **投稿削除：共有投稿削除** | 1. 共有投稿を削除<br>2. ソーシャルフィード確認 | ✓ achievements レコード削除<br>✓ ソーシャルフィードから消去 | 中 |

### 異常系

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **投稿作成：空白のみのテキスト** | 1. 空白のみ入力（"   "）<br>2. 送信ボタンクリック | ✓ エラーアラート表示<br>✓ "内容を入力してください"<br>✓ DB に保存されない | 高 |
| **投稿作成：制限到達時** | 1. 当日15件投稿済み<br>2. 新規投稿作成<br>3. 送信 | ✓ エラーアラート表示<br>✓ "本日の投稿上限（15件）に達しました"<br>✓ 送信ボタン disabled | 高 |
| **投稿作成：画像制限超過** | 1. 当月5枚投稿済み<br>2. 新規投稿に画像添付<br>3. 送信 | ✓ エラーアラート表示<br>✓ "今月の画像上限（5枚）に達しました"<br>✓ 画像が保存されない | 高 |
| **投稿作成：画像形式不正** | 1. BMP ファイルを選択 | ✓ エラーアラート表示<br>✓ "JPEG、PNG、WebP、GIF形式の画像を選択してください"<br>✓ プレビューに追加されない | 高 |
| **投稿作成：アップロード失敗** | 1. ネットワーク遮断（DevTools）<br>2. テキスト＋画像で送信 | ✓ エラーアラート表示<br>✓ "アップロードに失敗しました"<br>✓ タイムラインリダイレクトなし | 高 |
| **投稿作成：レート制限** | 1. 3秒以内に5回送信<br>2. 6回目で制限チェック | ✓ 6回目で レート制限エラー<br>✓ エラーメッセージに残り時間表示 | 中 |
| **投稿編集：24時間超過** | 1. 24時間以上前の投稿編集<br>2. テキスト変更<br>3. 送信 | ✓ エラーアラート表示<br>✓ "編集可能期間（24時間）を過ぎています"<br>✓ 編集されない | 高 |
| **投稿編集：他ユーザー投稿** | 1. UserA の投稿の編集URL を UserB が開く<br>2. テキスト変更<br>3. 送信 | ✓ エラーアラート表示<br>✓ "このエントリを更新する権限がありません"<br>✓ 編集されない | 高 |
| **投稿削除：他ユーザー投稿** | 1. UserA の投稿を UserB が削除<br>2. 削除確認 | ✓ エラーアラート表示<br>✓ "このエントリを削除する権限がありません"<br>✓ 削除されない | 高 |
| **投稿削除：ネットワークエラー** | 1. ネットワーク遮断（DevTools）<br>2. 投稿削除実行 | ✓ エラーアラート表示<br>✓ タイムラインに投稿が残存 | 中 |
| **UI：送信中の状態** | 1. テキスト入力<br>2. 送信クリック<br>3. 即座にもう一度送信クリック試行 | ✓ 送信ボタン disabled<br>✓ ローディング表示<br>✓ 2回目の送信は無視 | 中 |
| **UI：フォーカス状態** | 1. テキスト入力開始<br>2. フォーカスイン | ✓ フォームボーダー色変更（focused）<br>✓ shadow 追加 | 低 |

### 境界値・エッジケース

| テスト名 | ステップ | 期待結果 | 優先度 |
|---------|---------|---------|--------|
| **投稿作成：最大長テキスト** | 1. 1000文字のテキスト入力<br>2. 送信 | ✓ すべてのテキストが保存<br>✓ タイムラインで正しく表示<br>✓ 行折返しが適切 | 低 |
| **投稿作成：複数行テキスト** | 1. 改行を含むテキスト入力<br>2. 送信 | ✓ 改行がプレビューに表示<br>✓ 改行が DB に保存<br>✓ タイムラインで改行表示 | 低 |
| **投稿作成：特殊文字テキスト** | 1. < > " ' & を含むテキスト<br>2. 送信 | ✓ 文字が XSS なくそのまま保存<br>✓ 表示時にエスケープ | 中 |
| **投稿作成：タイムゾーン境界** | 1. 2024-12-31 23:50 JST に投稿A<br>2. 2025-01-01 00:10 JST に投稿B<br>3. 日次カウント確認 | ✓ 投稿A は 2024-12-31 のカウント<br>✓ 投稿B は 2025-01-01 のカウント<br>✓ 境界を正しく判定 | 中 |
| **投稿作成：画像サイズ境界** | 1. 200KB ちょうどの画像添付<br>2. 210KB の画像添付 | ✓ 200KB は圧縮なしで保存<br>✓ 210KB は圧縮処理実行 | 低 |
| **投稿作成：画像解像度高** | 1. 4000x3000px の高解像度画像<br>2. 添付・送信 | ✓ maxWidthOrHeight=1920 で制約<br>✓ 圧縮後アップロード | 低 |
| **投稿編集：制限内での再編集** | 1. 投稿を3回編集（24h以内）<br>2. 最終版が保存 | ✓ 3回の編集がすべて成功<br>✓ 最後の編集内容が最新 | 低 |
| **投稿削除→復元** | 1. 投稿を削除<br>2. タイムラインで非表示確認<br>3. 直後に復元ボタン試行 | ✓ 削除は is_deleted=true（論理削除）<br>✓ 復元機能がない場合は期待値なし | 低 |
| **画像：複数同時アップロード** | 1. 画像2枚を素早く添付<br>2. 送信 | ✓ Promise.all で並列アップロード<br>✓ 両方の URL が保存 | 中 |
| **画像：アップロード途中でリロード** | 1. 画像添付・送信<br>2. アップロード途中でリロード | ✓ アップロード済みの画像は削除（cleanup）<br>✓ DB にエントリが保存されない | 中 |
| **下書き：複数投稿タブ** | 1. タブA で投稿作成中<br>2. タブB で投稿作成中<br>3. タブA に戻す<br>4. localStorage 確認 | ✓ 後に編集したタブの下書きが上書き<br>✓ FIFO的な動作 | 低 |
| **下書き：大きなコンテンツ** | 1. 画像2枚 + テキスト 1000文字<br>2. 下書き保存<br>3. ページリロード<br>4. 復元確認 | ✓ localStorage に保存成功<br>✓ 復元でテキスト＋画像プレビュー復帰 | 低 |

---

## テスト実装の優先順位

### Phase 1（高優先度）- 必ず実装
- **ユニットテスト**: createEntry, updateEntry, deleteEntry の正常系・エラー系
- **ユニットテスト**: checkDailyEntryLimit, checkDailyImageLimit
- **E2Eテスト**: 投稿作成（テキスト・画像）、編集、削除の基本フロー
- **E2Eテスト**: 制限到達時のエラー表示

### Phase 2（中優先度）- できるだけ実装
- **ユニットテスト**: 副作用（updateStreakOnEntry, achievements）
- **ユニットテスト**: 下書き保存・復元
- **E2Eテスト**: 共有状態の切り替え
- **E2Eテスト**: 画像圧縮・アップロード
- **E2Eテスト**: タイムゾーン境界

### Phase 3（低優先度）- リソース余裕時
- **ユニットテスト**: 画像圧縮の詳細オプション
- **E2Eテスト**: エッジケース（最大長テキスト、特殊文字）
- **E2Eテスト**: ネットワークエラー復旧
- **E2Eテスト**: アップロード途中リロード

---

## ギャップ対応時のテスト更新チェックリスト

日次投稿制限・画像添付制限・下書き保存モードが仕様に合わせて修正された場合は、以下を更新：

- [ ] 日次投稿制限を 15 → 20 に修正した場合
  - `checkDailyEntryLimit制限到達`: remaining を `0` から `5` に更新
  - E2E「制限到達時」テストで制限値を 20 に変更

- [ ] 画像添付制限を月単位 → 日単位に修正した場合
  - `checkDailyImageLimit制限到達`: 制限値を月単位→日単位に変更
  - `getDailyImageCount`: 関数名/実装を確認

- [ ] 下書き保存を編集モード対応に修正した場合
  - E2E「投稿編集：下書き自動保存」テストを追加
  - `entry-form.tsx` の編集モード分岐で `saveDraft()` 呼び出し確認
