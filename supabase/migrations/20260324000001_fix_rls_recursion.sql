-- ================================================================
-- RLS 再帰問題の修正
-- profiles テーブルのポリシーが profiles を再参照して無限再帰が起きるため、
-- SECURITY DEFINER 関数で RLS を迂回して役割確認する方式に変更する
-- ================================================================

-- ----------------------------------------------------------------
-- 1. 役割確認用 SECURITY DEFINER 関数
--    RLS を迂回してロールを返す（再帰を防ぐ）
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- ----------------------------------------------------------------
-- 2. profiles ポリシー修正
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "profiles: parent read all"    ON public.profiles;
DROP POLICY IF EXISTS "profiles: parent update child" ON public.profiles;

CREATE POLICY "profiles: parent read all"
  ON public.profiles FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'parent');

CREATE POLICY "profiles: parent update child"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'parent')
  WITH CHECK (public.get_user_role(auth.uid()) = 'parent');

-- ----------------------------------------------------------------
-- 3. chore_masters ポリシー修正
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "chore_masters: child read own"  ON public.chore_masters;
DROP POLICY IF EXISTS "chore_masters: parent read all" ON public.chore_masters;
DROP POLICY IF EXISTS "chore_masters: parent insert"   ON public.chore_masters;
DROP POLICY IF EXISTS "chore_masters: parent update"   ON public.chore_masters;

CREATE POLICY "chore_masters: child read own"
  ON public.chore_masters FOR SELECT
  USING (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "chore_masters: parent read all"
  ON public.chore_masters FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'parent');

CREATE POLICY "chore_masters: parent insert"
  ON public.chore_masters FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'parent');

CREATE POLICY "chore_masters: parent update"
  ON public.chore_masters FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'parent')
  WITH CHECK (public.get_user_role(auth.uid()) = 'parent');

-- ----------------------------------------------------------------
-- 4. chore_records ポリシー修正
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "chore_records: child read own"   ON public.chore_records;
DROP POLICY IF EXISTS "chore_records: parent read all"  ON public.chore_records;
DROP POLICY IF EXISTS "chore_records: child insert own" ON public.chore_records;
DROP POLICY IF EXISTS "chore_records: child update own" ON public.chore_records;
DROP POLICY IF EXISTS "chore_records: child delete own" ON public.chore_records;
DROP POLICY IF EXISTS "chore_records: parent write all" ON public.chore_records;

CREATE POLICY "chore_records: child read own"
  ON public.chore_records FOR SELECT
  USING (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "chore_records: parent read all"
  ON public.chore_records FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'parent');

CREATE POLICY "chore_records: child insert own"
  ON public.chore_records FOR INSERT
  WITH CHECK (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "chore_records: child update own"
  ON public.chore_records FOR UPDATE
  USING (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child')
  WITH CHECK (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "chore_records: child delete own"
  ON public.chore_records FOR DELETE
  USING (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "chore_records: parent write all"
  ON public.chore_records FOR ALL
  USING (public.get_user_role(auth.uid()) = 'parent')
  WITH CHECK (public.get_user_role(auth.uid()) = 'parent');

-- ----------------------------------------------------------------
-- 5. monthly_summaries ポリシー修正
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "monthly_summaries: child read own" ON public.monthly_summaries;
DROP POLICY IF EXISTS "monthly_summaries: parent all"     ON public.monthly_summaries;

CREATE POLICY "monthly_summaries: child read own"
  ON public.monthly_summaries FOR SELECT
  USING (child_id = auth.uid() AND public.get_user_role(auth.uid()) = 'child');

CREATE POLICY "monthly_summaries: parent all"
  ON public.monthly_summaries FOR ALL
  USING (public.get_user_role(auth.uid()) = 'parent')
  WITH CHECK (public.get_user_role(auth.uid()) = 'parent');
