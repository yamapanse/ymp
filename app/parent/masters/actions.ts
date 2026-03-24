'use server';

import { createClient } from '@/lib/supabase/server';
import { format, subDays, parseISO } from 'date-fns';

async function assertParent() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'parent') return null;
  return supabase;
}

export async function addChoreMaster(data: {
  childId: string;
  name: string;
  unitPrice: number;
  validFrom: string;
}) {
  const supabase = await assertParent();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase.from('chore_masters').insert({
    child_id: data.childId,
    name: data.name,
    unit_price: data.unitPrice,
    valid_from: data.validFrom,
    valid_to: null,
    is_active: true,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function reviseUnitPrice(
  masterId: string,
  newPrice: number,
  effectiveDate: string
) {
  const supabase = await assertParent();
  if (!supabase) return { error: 'Unauthorized' };

  const { data: old } = await supabase
    .from('chore_masters')
    .select('*')
    .eq('id', masterId)
    .single();

  if (!old) return { error: 'マスタが見つかりません' };

  // 旧行のvalid_toを改定前日にセット
  const prevDay = format(subDays(parseISO(effectiveDate), 1), 'yyyy-MM-dd');

  const { error: e1 } = await supabase
    .from('chore_masters')
    .update({ valid_to: prevDay })
    .eq('id', masterId);
  if (e1) return { error: e1.message };

  // 新行をinsert
  const { error: e2 } = await supabase.from('chore_masters').insert({
    child_id: old.child_id,
    name: old.name,
    unit_price: newPrice,
    valid_from: effectiveDate,
    valid_to: null,
    is_active: true,
  });
  if (e2) return { error: e2.message };

  return { success: true };
}

export async function deactivateChoreMaster(masterId: string) {
  const supabase = await assertParent();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('chore_masters')
    .update({ is_active: false })
    .eq('id', masterId);

  if (error) return { error: error.message };
  return { success: true };
}
