import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/parent/top-nav';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('[parent/layout] user.id:', user.id);
  console.log('[parent/layout] profile:', profile, 'error:', profileError?.message);

  if (!profile || profile.role !== 'parent') redirect('/child/today');

  return (
    <div className="flex flex-1 flex-col">
      <TopNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
