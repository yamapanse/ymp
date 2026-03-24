'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/child/today', label: '今日', icon: Clock },
  { href: '/child/calendar', label: '月別', icon: CalendarDays },
  { href: '/child/history', label: '履歴', icon: History },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-app -translate-x-1/2 border-t border-border bg-background">
      <div className="flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
