'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/parent/dashboard', label: 'ダッシュボード' },
  { href: '/parent/masters', label: 'マスタ管理' },
  { href: '/parent/children', label: '子供管理' },
  { href: '/parent/records', label: '月次明細' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">おこづかい帳（親）</p>
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
