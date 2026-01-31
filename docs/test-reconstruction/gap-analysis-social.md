# ギャップ分析レポート: social

## 概要

| 項目 | 状況 |
|------|------|
| 仕様書 | `.kiro/specs/social/requirements.md`, `design.md`, `tasks.md` |
| 実装 | `src/features/social/` |
| 分析日 | 2026-01-17 |

## ギャップ一覧

### 1. お祝いプッシュ通知が呼び出されていない [Critical]

| 項目 | 内容 |
|------|------|
| 仕様 | アチーブメント達成時にフォロワーへプッシュ通知 |
| 実装 | `sendCelebrationPushNotification()` 関数は存在するが、`celebrateAchievement()` から呼び出されていない |
| 優先度 | **高** |
| 影響 | ソーシャル機能の価値低下 |

**関連ファイル**: `src/features/social/api/achievements.ts`

**対応案**: `celebrateAchievement()` 内で `sendCelebrationPushNotification()` を呼び出す

### 2. markAsRead / markAllAsRead 未実装

| 項目 | 内容 |
|------|------|
| 仕様 | 通知の既読処理 |
| 実装 | 未実装 |
| 優先度 | 中 |
| 影響 | 通知管理UX |

**関連ファイル**: `src/features/social/api/service.ts`

**対応案**: 既読処理関数を実装

### 3. 未読バッジ 未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ヘッダーに未読通知数バッジ表示 |
| 実装 | 未実装 |
| 優先度 | 中 |
| 影響 | 通知の視認性 |

**関連ファイル**: `src/components/header/` または `src/features/social/components/`

**対応案**: 未読数取得API + バッジコンポーネントを実装

### 4. テスト未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ユニットテスト・E2Eテスト |
| 実装 | 未実装（削除済み） |
| 優先度 | 高 |
| 影響 | 品質保証 |

## 仕様書更新の必要性

| 項目 | 更新内容 |
|------|---------|
| なし | 仕様書は現状維持（実装を修正） |

## テスト観点

### ユニットテスト

- [ ] `service.ts`: フォロー・アンフォロー
- [ ] `achievements.ts`: アチーブメント判定・作成
- [ ] `celebrateAchievement`: お祝い通知作成
- [ ] `sendCelebrationPushNotification`: プッシュ通知送信
- [ ] 通知の既読処理
- [ ] ユーザー検索

### E2Eテスト

- [ ] ユーザー検索・プロフィール表示
- [ ] フォロー・アンフォローフロー
- [ ] ソーシャルフィード表示
- [ ] アチーブメント達成・お祝い
- [ ] 通知一覧・既読処理

## 結論

**お祝いプッシュ通知の呼び出し漏れは即時修正が必要**。フォロワーへの通知がソーシャル機能の核心であり、これが動作しないと機能の価値が半減する。既読処理・未読バッジは優先度を判断して対応。

## 修正コード例

```typescript
// src/features/social/api/achievements.ts
export async function celebrateAchievement(
  userId: string,
  achievementType: AchievementType,
  threshold: number
): Promise<SocialResult<void>> {
  // ... 既存のロジック（DB通知作成）...

  // プッシュ通知を送信（追加）
  await sendCelebrationPushNotification(userId, achievementType, threshold)

  return { ok: true, value: undefined }
}
```
