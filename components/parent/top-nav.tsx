'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const tabs = [
  { href: '/parent/dashboard', label: 'ダッシュボード' },
  { href: '/parent/masters', label: 'マスタ管理' },
  { href: '/parent/children', label: '子供管理' },
  { href: '/parent/records', label: '月次明細' },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">おこづかい帳（親）</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          ログアウト
        </button>
      </div>
      <nav className="flex overflow-x-auto border-t border-border">
        {tabs.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
