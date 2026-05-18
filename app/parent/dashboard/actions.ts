'use server';

import { endOfMonth, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/server';

const TZ = 'Asia/Tokyo';

export async function markAsPaid(childId: string, yearMonth: string) {
  const supabase = createClient();

  // 親チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (meError) return { error: meError.message };
  if (me?.role !== 'parent') return { error: 'Forbidden' };

  // 当月のchore_records合計を計算
  const monthEnd = formatInTimeZone(
    endOfMonth(parseISO(`${yearMonth}-01`)),
    TZ,
    'yyyy-MM-dd'
  );
  const { data: records, error: recordsError } = await supabase
    .from('chore_records')
    .select('count, unit_price_snapshot')
    .eq('child_id', childId)
    .gte('date', `${yearMonth}-01`)
    .lte('date', monthEnd);

  if (recordsError) {
    return { error: recordsError.message };
  }

  const choreTotal = (records ?? []).reduce(
    (s, r) => s + r.count * r.unit_price_snapshot,
    0
  );

  // base_allowance取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('base_allowance')
    .eq('id', childId)
    .single();

  if (profileError) {
    return { error: profileError.message };
  }

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
