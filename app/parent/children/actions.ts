'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function updateChildProfile(
  childId: string,
  data: { name: string; baseAllowance: number }
) {
  const supabase = await assertParent();
  if (!supabase) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('profiles')
    .update({ name: data.name, base_allowance: data.baseAllowance })
    .eq('id', childId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function createChildAccount(data: {
  email: string;
  password: string;
  name: string;
  baseAllowance: number;
}) {
  const supabase = await assertParent();
  if (!supabase) return { error: 'Unauthorized' };

  const admin = createAdminClient();

  // Auth ユーザー作成（メール確認スキップ）
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name, role: 'child' },
  });

  if (authError) return { error: authError.message };
  if (!created.user) return { error: 'ユーザー作成に失敗しました' };

  // profiles upsert（triggerが動くが、base_allowanceは手動で設定）
  const { error: profileError } = await admin.from('profiles').upsert({
    id: created.user.id,
    name: data.name,
    role: 'child',
    base_allowance: data.baseAllowance,
  });

  if (profileError) return { error: profileError.message };
  return { success: true };
}
