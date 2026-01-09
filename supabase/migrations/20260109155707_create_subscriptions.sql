-- 課金機能のためのテーブル作成
-- サブスクリプション管理 + ほつれ追加購入対応

-- ========================================
-- subscriptions テーブル
-- ========================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Stripe関連
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- プラン情報
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium_monthly', 'premium_yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),

  -- 期間
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のサブスクリプションのみ参照可能
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザー自身のサブスクリプションを挿入可能（初回登録時）
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- サービスロール（Webhook用）はすべての操作が可能
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- updated_atトリガー（既存の関数を利用）
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- hotsure_purchases テーブル（ほつれ単発購入履歴）
-- ========================================
CREATE TABLE public.hotsure_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Stripe関連
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,

  -- 購入内容
  quantity INTEGER NOT NULL DEFAULT 2, -- ほつれ2回分
  amount INTEGER NOT NULL, -- 金額（円）

  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- メタデータ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_hotsure_purchases_user_id ON public.hotsure_purchases(user_id);
CREATE INDEX idx_hotsure_purchases_stripe_payment_intent_id ON public.hotsure_purchases(stripe_payment_intent_id);

-- RLS
ALTER TABLE public.hotsure_purchases ENABLE ROW LEVEL SECURITY;

-- ユーザー自身の購入履歴のみ参照可能
CREATE POLICY "Users can view own purchases"
  ON public.hotsure_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザー自身の購入を挿入可能
CREATE POLICY "Users can insert own purchases"
  ON public.hotsure_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- サービスロール（Webhook用）はすべての操作が可能
CREATE POLICY "Service role can manage purchases"
  ON public.hotsure_purchases FOR ALL
  USING (auth.role() = 'service_role');

-- ========================================
-- streaks テーブルに bonus_hotsure カラム追加
-- ========================================
ALTER TABLE public.streaks
ADD COLUMN IF NOT EXISTS bonus_hotsure INTEGER NOT NULL DEFAULT 0;

-- コメント
COMMENT ON TABLE public.subscriptions IS 'ユーザーのサブスクリプション情報（Stripe連携）';
COMMENT ON TABLE public.hotsure_purchases IS 'ほつれ単発購入の履歴';
COMMENT ON COLUMN public.streaks.bonus_hotsure IS '購入した追加ほつれの残り回数';
