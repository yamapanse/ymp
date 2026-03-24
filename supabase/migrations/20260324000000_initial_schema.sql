-- ============================================================
-- お手伝いお小遣い管理アプリ 初期スキーマ
-- ============================================================

-- ----------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  role            text        NOT NULL CHECK (role IN ('parent', 'child')),
  base_allowance  integer     CHECK (base_allowance >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles                IS 'ユーザープロファイル（親・子供）';
COMMENT ON COLUMN public.profiles.base_allowance IS '子供のみ使用。月の基本お小遣い（円）';

-- ----------------------------------------------------------------
-- 2. chore_masters
-- ----------------------------------------------------------------
CREATE TABLE public.chore_masters (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  unit_price  integer     NOT NULL CHECK (unit_price >= 0),
  valid_from  date        NOT NULL,
  valid_to    date,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

COMMENT ON TABLE  public.chore_masters            IS 'お手伝いマスタ。単価改定は旧行valid_to更新＋新行insertで管理';
COMMENT ON COLUMN public.chore_masters.valid_to   IS 'NULLが現在有効を示す';
COMMENT ON COLUMN public.chore_masters.is_active  IS 'false=論理削除';

-- ----------------------------------------------------------------
-- 3. chore_records
-- ----------------------------------------------------------------
CREATE TABLE public.chore_records (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chore_master_id      uuid        NOT NULL REFERENCES public.chore_masters(id),
  date                 date        NOT NULL,
  count                integer     NOT NULL DEFAULT 1 CHECK (count >= 1),
  unit_price_snapshot  integer     NOT NULL CHECK (unit_price_snapshot >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (child_id, chore_master_id, date)
);

COMMENT ON TABLE  public.chore_records                      IS 'お手伝い実績記録';
COMMENT ON COLUMN public.chore_records.unit_price_snapshot  IS '記録時点の単価スナップショット。以後の改定の影響を受けない';
COMMENT ON COLUMN public.chore_records.date                 IS 'JSTの日付';

-- ----------------------------------------------------------------
-- 4. monthly_summaries
-- ----------------------------------------------------------------
CREATE TABLE public.monthly_summaries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year_month      text        NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  base_allowance  integer     NOT NULL CHECK (base_allowance >= 0),
  chore_total     integer     NOT NULL DEFAULT 0 CHECK (chore_total >= 0),
  total_amount    integer     NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (child_id, year_month)
);

COMMENT ON TABLE  public.monthly_summaries               IS '月次お小遣いサマリー';
COMMENT ON COLUMN public.monthly_summaries.year_month    IS '例: "2025-03"';
COMMENT ON COLUMN public.monthly_summaries.base_allowance IS '締め時点の基本料金スナップショット';
COMMENT ON COLUMN public.monthly_summaries.paid_at       IS 'NULLなら未支給';

-- ================================================================
-- インデックス
-- ================================================================

-- chore_masters
CREATE INDEX idx_chore_masters_child_id    ON public.chore_masters(child_id);
CREATE INDEX idx_chore_masters_active      ON public.chore_masters(child_id, is_active) WHERE is_active = true;
CREATE INDEX idx_chore_masters_valid_range ON public.chore_masters(child_id, valid_from, valid_to);

-- chore_records
CREATE INDEX idx_chore_records_child_id   ON public.chore_records(child_id);
CREATE INDEX idx_chore_records_date       ON public.chore_records(child_id, date);

-- monthly_summaries
CREATE INDEX idx_monthly_summaries_child_id   ON public.monthly_summaries(child_id);
CREATE INDEX idx_monthly_summaries_year_month ON public.monthly_summaries(child_id, year_month DESC);

-- ================================================================
-- RLS 有効化
-- ================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_masters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chore_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS ポリシー: profiles
-- ================================================================

-- 自分のprofileは誰でも読める
CREATE POLICY "profiles: self read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 親は全員のprofileを読める
CREATE POLICY "profiles: parent read all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- 自分のprofileは自分だけ更新可
CREATE POLICY "profiles: self update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 親は子供のprofileを更新可
CREATE POLICY "profiles: parent update child"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- サインアップ時にinsert可（自分自身のみ）
CREATE POLICY "profiles: self insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ================================================================
-- RLS ポリシー: chore_masters
-- ================================================================

-- 子供: 自分のマスタのみ読み取り可
CREATE POLICY "chore_masters: child read own"
  ON public.chore_masters FOR SELECT
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 親: 全件読み取り可
CREATE POLICY "chore_masters: parent read all"
  ON public.chore_masters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- 親のみ insert
CREATE POLICY "chore_masters: parent insert"
  ON public.chore_masters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- 親のみ update
CREATE POLICY "chore_masters: parent update"
  ON public.chore_masters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- ================================================================
-- RLS ポリシー: chore_records
-- ================================================================

-- 子供: 自分のレコードのみ読み取り可
CREATE POLICY "chore_records: child read own"
  ON public.chore_records FOR SELECT
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 親: 全件読み取り可
CREATE POLICY "chore_records: parent read all"
  ON public.chore_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- 子供: 自分のレコードのみ insert
CREATE POLICY "chore_records: child insert own"
  ON public.chore_records FOR INSERT
  WITH CHECK (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 子供: 自分のレコードのみ update（count修正などに対応）
CREATE POLICY "chore_records: child update own"
  ON public.chore_records FOR UPDATE
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  )
  WITH CHECK (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 子供: 自分のレコードのみ delete（保存前の取り消しに対応）
CREATE POLICY "chore_records: child delete own"
  ON public.chore_records FOR DELETE
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 親: 全件書き込み可
CREATE POLICY "chore_records: parent write all"
  ON public.chore_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- ================================================================
-- RLS ポリシー: monthly_summaries
-- ================================================================

-- 子供: 自分のサマリーのみ読み取り可
CREATE POLICY "monthly_summaries: child read own"
  ON public.monthly_summaries FOR SELECT
  USING (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'child'
    )
  );

-- 親: 全件読み書き可
CREATE POLICY "monthly_summaries: parent all"
  ON public.monthly_summaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
  );

-- ================================================================
-- トリガー: auth.users 新規登録時に profiles を自動作成
-- （Supabase Auth の after-sign-up フックとして利用）
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'child')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
