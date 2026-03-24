'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Summary = {
  id: string;
  year_month: string;
  base_allowance: number;
  chore_total: number;
  total_amount: number;
  paid_at: string | null;
};

export default function HistoryPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('monthly_summaries')
        .select('id, year_month, base_allowance, chore_total, total_amount, paid_at')
        .eq('child_id', user.id)
        .order('year_month', { ascending: false });

      setSummaries(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-bold">お小遣い履歴</h1>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">読み込み中…</p>
      ) : summaries.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          まだ履歴がありません
        </p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const [year, month] = s.year_month.split('-');
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-bold">
                    {year}年{month}月
                  </span>
                  {s.paid_at ? (
                    <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                      支給済み
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                      未支給
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">基本料金</span>
                    <span>{s.base_allowance.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">お手伝い合計</span>
                    <span>{s.chore_total.toLocaleString()}円</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 font-bold">
                    <span>合計</span>
                    <span className="text-primary">{s.total_amount.toLocaleString()}円</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
