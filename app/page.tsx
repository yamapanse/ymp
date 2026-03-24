import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * ルートページ: ログイン済みの場合はロールに応じてリダイレクト
 * 未ログインは middleware が /login に飛ばす
 */
export default async function RootPage() {
  const supabase = createClient();

  // ルーティング専用: getSession() はクッキーから直接読む（ネットワーク不要）
  // セキュアな操作には getUser() を使うが、リダイレクト先の判定はこれで十分
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role === 'parent') {
    redirect('/parent');
  } else {
    redirect('/child/today');
  }
}
