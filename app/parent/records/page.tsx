'use client';

import { useEffect, useState } from 'react';
import { endOfMonth, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/client';

const TZ = 'Asia/Tokyo';

type Child = { id: string; name: string };
type Record = {
  id: string;
  date: string;
  count: number;
  unit_price_snapshot: number;
  chore_masters: { name: string } | null;
};

export default function RecordsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [yearMonth, setYearMonth] = useState(
    formatInTimeZone(new Date(), TZ, 'yyyy-MM')
  );
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'child')
        .order('name');
      const list = data ?? [];
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('chore_records')
        .select('id, date, count, unit_price_snapshot, chore_masters(name)')
        .eq('child_id', selectedChild)
        .gte('date', `${yearMonth}-01`)
        .lte('date', formatInTimeZone(endOfMonth(parseISO(`${yearMonth}-01`)), TZ, 'yyyy-MM-dd'))
        .order('date');
      setRecords((data as Record[]) ?? []);
      setLoading(false);
    })();
  }, [selectedChild, yearMonth]);

  const total = records.reduce((s, r) => s + r.count * r.unit_price_snapshot, 0);

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-bold">月次明細確認</h1>

      {/* 子供選択タブ */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedChild(c.id)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedChild === c.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 月選択 */}
      <input
        type="month"
        value={yearMonth}
        onChange={(e) => setYearMonth(e.target.value)}
        className="mb-5 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* 明細テーブル */}
      {loading ? (
        <p className="py-6 text-center text-muted-foreground">読み込み中…</p>
      ) : records.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">記録がありません</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">日付</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">お手伝い</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">回数</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">単価</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.date.slice(5)}
                    </td>
                    <td className="px-3 py-2">{r.chore_masters?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-right">{r.unit_price_snapshot}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {(r.count * r.unit_price_snapshot).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-secondary">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right font-bold">
                    合計
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-primary">
                    {total.toLocaleString()}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
