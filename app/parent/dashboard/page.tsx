'use client';

import { useEffect, useState } from 'react';
import { endOfMonth, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/client';
import { markAsPaid } from './actions';

const TZ = 'Asia/Tokyo';

function currentYearMonth() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM');
}

type ChildData = {
  id: string;
  name: string;
  base: number;
  choreTotal: number;
  total: number;
  paidAt: string | null;
};

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPayingId] = useState<string | null>(null);

  async function fetchData(ym: string) {
    setLoading(true);
    const supabase = createClient();

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, base_allowance')
      .eq('role', 'child')
      .order('name');

    const results: ChildData[] = await Promise.all(
      (profiles ?? []).map(async (p) => {
        const [{ data: records }, { data: summary }] = await Promise.all([
          supabase
            .from('chore_records')
            .select('count, unit_price_snapshot')
            .eq('child_id', p.id)
            .gte('date', `${ym}-01`)
            .lte('date', formatInTimeZone(endOfMonth(parseISO(`${ym}-01`)), TZ, 'yyyy-MM-dd')),
          supabase
            .from('monthly_summaries')
            .select('paid_at')
            .eq('child_id', p.id)
            .eq('year_month', ym)
            .maybeSingle(),
        ]);

        const choreTotal = (records ?? []).reduce(
          (s, r) => s + r.count * r.unit_price_snapshot,
          0
        );
        const base = p.base_allowance ?? 0;

        return {
          id: p.id,
          name: p.name,
          base,
          choreTotal,
          total: base + choreTotal,
          paidAt: summary?.paid_at ?? null,
        };
      })
    );

    setChildren(results);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(yearMonth);
  }, [yearMonth]);

  async function handleMarkPaid(childId: string) {
    setPayingId(childId);
    await markAsPaid(childId, yearMonth);
    await fetchData(yearMonth);
    setPayingId(null);
  }

  const [y, m] = yearMonth.split('-');

  return (
    <div className="px-4 py-5">
      {/* 月選択 */}
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-lg font-bold">ダッシュボード</h1>
        <input
          type="month"
          value={yearMonth}
          max={currentYearMonth()}
          onChange={(e) => setYearMonth(e.target.value)}
          className="ml-auto rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {y}年{m}月
      </p>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">読み込み中…</p>
      ) : children.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          子供アカウントがありません
        </p>
      ) : (
        <div className="space-y-4">
          {children.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">{c.name}</h2>
                {c.paidAt ? (
                  <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                    支給済み
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                    未支給
                  </span>
                )}
              </div>

              <div className="mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">基本料金</span>
                  <span>{c.base.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">お手伝い合計</span>
                  <span>{c.choreTotal.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-bold">
                  <span>合計金額</span>
                  <span className="text-primary">{c.total.toLocaleString()}円</span>
                </div>
              </div>

              {!c.paidAt && (
                <button
                  onClick={() => handleMarkPaid(c.id)}
                  disabled={paying === c.id}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {paying === c.id ? '処理中…' : '支給済みにする'}
                </button>
              )}

              {c.paidAt && (
                <p className="text-center text-xs text-muted-foreground">
                  支給日:{' '}
                  {new Date(c.paidAt).toLocaleDateString('ja-JP', {
                    timeZone: TZ,
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
