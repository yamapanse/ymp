'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  // profiles.role を取得してリダイレクト先を決定
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'ログインに失敗しました' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'parent') {
    redirect('/parent');
  } else {
    redirect('/child/today');
  }
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
