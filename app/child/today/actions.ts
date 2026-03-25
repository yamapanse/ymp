'use server';

import { createClient } from '@/lib/supabase/server';

type CheckedRecord = {
  chore_master_id: string;
  count: number;
  unit_price_snapshot: number;
};

export async function saveChoreRecords({
  date,
  checked,
  uncheckedMasterIds,
}: {
  date: string;
  checked: CheckedRecord[];
  uncheckedMasterIds: string[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 支給済み月はロック
  const yearMonth = date.slice(0, 7);
  const { data: summary } = await supabase
    .from('monthly_summaries')
    .select('paid_at')
    .eq('child_id', user.id)
    .eq('year_month', yearMonth)
    .maybeSingle();
  if (summary?.paid_at) return { error: 'この月はすでに支給済みのため変更できません' };

  // チェック済みをupsert
  if (checked.length > 0) {
    const records = checked.map((r) => ({
      child_id: user.id,
      chore_master_id: r.chore_master_id,
      date,
      count: r.count,
      unit_price_snapshot: r.unit_price_snapshot,
    }));

    const { error } = await supabase
      .from('chore_records')
      .upsert(records, { onConflict: 'child_id,chore_master_id,date' });

    if (error) return { error: error.message };
  }

  // チェックなし（未チェック）の既存レコードを削除
  if (uncheckedMasterIds.length > 0) {
    const { error } = await supabase
      .from('chore_records')
      .delete()
      .eq('child_id', user.id)
      .eq('date', date)
      .in('chore_master_id', uncheckedMasterIds);

    if (error) return { error: error.message };
  }

  return { success: true };
}
