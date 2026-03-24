'use server';

import { createClient } from '@/lib/supabase/server';

export async function markAsPaid(childId: string, yearMonth: string) {
  const supabase = createClient();

  // 親チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (me?.role !== 'parent') return { error: 'Forbidden' };

  // 当月のchore_records合計を計算
  const { data: records } = await supabase
    .from('chore_records')
    .select('count, unit_price_snapshot')
    .eq('child_id', childId)
    .gte('date', `${yearMonth}-01`)
    .lte('date', `${yearMonth}-31`);

  const choreTotal = (records ?? []).reduce(
    (s, r) => s + r.count * r.unit_price_snapshot,
    0
  );

  // base_allowance取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('base_allowance')
    .eq('id', childId)
    .single();

  const base = profile?.base_allowance ?? 0;

  const { error } = await supabase.from('monthly_summaries').upsert(
    {
      child_id: childId,
      year_month: yearMonth,
      base_allowance: base,
      chore_total: choreTotal,
      total_amount: base + choreTotal,
      paid_at: new Date().toISOString(),
    },
    { onConflict: 'child_id,year_month' }
  );

  if (error) return { error: error.message };
  return { success: true };
}
