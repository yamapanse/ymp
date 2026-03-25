'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ChildHeader() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
      <p className="text-xs font-semibold text-muted-foreground">おこづかい帳</p>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        ログアウト
      </button>
    </header>
  );
}
