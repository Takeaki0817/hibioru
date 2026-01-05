# Requirements Document

## Introduction

投稿時のアチーブメント達成演出機能。投稿成功時に新規達成を検出し、達成レベル（1-3）に応じたパーティクルエフェクトとバイブレーションを発生させる。既存のパーティクルアニメーション（celebrate-button.tsx）を拡張し、Level 1は12パーティクル1波、Level 2は16パーティクル2波、Level 3は24パーティクル3波で断続発生させる。createEntry()の戻り値を拡張して新規達成を含め、SuccessOverlayで演出を統合する。

本機能はヒビオルの「継続に対する報酬」設計原則に沿い、投稿によって達成したアチーブメントを視覚的・触覚的にフィードバックすることで、ユーザーのモチベーションを高める。

## Requirements

### Requirement 1: 達成検出と戻り値拡張

**Objective:** ユーザーとして、投稿成功時に新規達成したアチーブメントを知りたい。これにより達成感を得られ、継続のモチベーションが高まる。

#### Acceptance Criteria

1. When ユーザーが投稿を送信して成功した場合, the Entry Service shall 新規達成したアチーブメント情報を戻り値に含める
2. When 新規達成がない場合, the Entry Service shall 達成リストを空配列として返す
3. When 達成情報の取得に失敗した場合, the Entry Service shall エントリ作成成功を優先し、達成情報はnullとして返す（エントリ作成失敗にしない）
4. The Entry Service shall 各達成に対して達成レベル（1, 2, 3）を含める

### Requirement 2: パーティクルエフェクト設定

**Objective:** ユーザーとして、達成レベルに応じた視覚的フィードバックを得たい。これにより達成の重要度が直感的に理解できる。

#### Acceptance Criteria

1. When 達成レベルが1の場合, the Achievement Celebration shall 12個のパーティクルを1波で放射状に表示する
2. When 達成レベルが2の場合, the Achievement Celebration shall 16個のパーティクルを2波で断続的に表示する
3. When 達成レベルが3の場合, the Achievement Celebration shall 24個のパーティクルを3波で断続的に表示する
4. The Achievement Celebration shall パーティクルをアクセントカラー（accent-400）で表示する
5. The Achievement Celebration shall 各波の間隔を200ミリ秒とする

### Requirement 3: バイブレーションフィードバック

**Objective:** ユーザーとして、触覚的なフィードバックによって達成をより強く実感したい。これにより視覚だけでなく体感でも達成を認識できる。

#### Acceptance Criteria

1. When 達成レベルが1の場合 and デバイスがバイブレーションをサポートしている場合, the Achievement Celebration shall 短い振動（100ms）を1回発生させる
2. When 達成レベルが2の場合 and デバイスがバイブレーションをサポートしている場合, the Achievement Celebration shall 中程度の振動パターン（100ms振動、50ms休止、100ms振動）を発生させる
3. When 達成レベルが3の場合 and デバイスがバイブレーションをサポートしている場合, the Achievement Celebration shall 長い振動パターン（100ms振動、50ms休止を3回繰り返し）を発生させる
4. If デバイスがバイブレーションをサポートしていない場合, the Achievement Celebration shall バイブレーション処理をスキップし、エラーを発生させない

### Requirement 4: SuccessOverlayへの統合

**Objective:** ユーザーとして、投稿成功時の既存演出と達成演出が自然に統合されていてほしい。これにより一貫したユーザー体験が得られる。

#### Acceptance Criteria

1. When 投稿成功時に新規達成がある場合, the Success Overlay shall チェックマークアニメーションの後にパーティクルエフェクトを表示する
2. When 複数の達成がある場合, the Success Overlay shall 最も高いレベルの達成に対応したエフェクトを表示する
3. When 新規達成がない場合, the Success Overlay shall 従来どおりチェックマークアニメーションのみを表示する
4. The Success Overlay shall 達成メッセージ（例:「継続7日達成！」）をオーバーレイに表示する
5. While パーティクルエフェクトが表示されている間, the Success Overlay shall オーバーレイを閉じない

### Requirement 5: パフォーマンスとアクセシビリティ

**Objective:** ユーザーとして、演出がスムーズに動作し、アクセシビリティにも配慮されていてほしい。これにより快適で包括的なユーザー体験が得られる。

#### Acceptance Criteria

1. The Achievement Celebration shall パーティクルアニメーションを60FPSで滑らかに動作させる
2. The Achievement Celebration shall 低スペックデバイスでもパフォーマンスに影響を与えないようGPUアクセラレーションを使用する
3. The Achievement Celebration shall アニメーション完了後に不要なDOM要素を確実にクリーンアップする
4. The Success Overlay shall 達成通知をスクリーンリーダーに適切に伝えるため aria-live="polite" を使用する
5. Where ユーザーが「視差効果を減らす」設定を有効にしている場合, the Achievement Celebration shall パーティクルアニメーションを簡略化または無効化する

### Requirement 6: 達成レベル定義

**Objective:** システムとして、達成の種類に応じて適切なレベルを割り当てたい。これにより達成の重要度に応じた演出が可能になる。

#### Acceptance Criteria

1. The Achievement System shall 以下のマイルストーンをLevel 1として扱う: 初投稿、継続3日
2. The Achievement System shall 以下のマイルストーンをLevel 2として扱う: 継続7日、継続14日、継続21日
3. The Achievement System shall 以下のマイルストーンをLevel 3として扱う: 継続30日、継続60日、継続90日、継続365日
4. The Achievement System shall 達成レベル情報をachievementsテーブルの既存データから導出する（新規カラム追加は不要）
