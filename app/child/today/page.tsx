'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { saveChoreRecords } from './actions';

const TZ = 'Asia/Tokyo';

function todayJST() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

type ChoreMaster = { id: string; name: string; unit_price: number };
type ChoreState = { checked: boolean; count: number };

export default function TodayPage() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get('date') ?? todayJST());
  const [chores, setChores] = useState<ChoreMaster[]>([]);
  const [states, setStates] = useState<Record<string, ChoreState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const fetchData = useCallback(async (selectedDate: string) => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: masters }, { data: records }] = await Promise.all([
      supabase
        .from('chore_masters')
        .select('id, name, unit_price')
        .eq('child_id', user.id)
        .eq('is_active', true)
        .lte('valid_from', selectedDate)
        .or(`valid_to.is.null,valid_to.gte.${selectedDate}`)
        .order('name'),
      supabase
        .from('chore_records')
        .select('chore_master_id, count')
        .eq('child_id', user.id)
        .eq('date', selectedDate),
    ]);

    const recordMap = Object.fromEntries(
      (records ?? []).map((r) => [r.chore_master_id, r.count])
    );

    const newStates: Record<string, ChoreState> = {};
    (masters ?? []).forEach((m) => {
      const existing = recordMap[m.id];
      newStates[m.id] = { checked: existing !== undefined, count: existing ?? 1 };
    });

    setChores(masters ?? []);
    setStates(newStates);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(date);
    setSavedMsg('');
  }, [date, fetchData]);

  function toggleCheck(id: string) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  }

  function updateCount(id: string, delta: number) {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], count: Math.max(1, prev[id].count + delta) },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSavedMsg('');

    const checked = chores
      .filter((c) => states[c.id]?.checked)
      .map((c) => ({
        chore_master_id: c.id,
        count: states[c.id].count,
        unit_price_snapshot: c.unit_price,
      }));

    const uncheckedMasterIds = chores
      .filter((c) => !states[c.id]?.checked)
      .map((c) => c.id);

    const result = await saveChoreRecords({ date, checked, uncheckedMasterIds });

    setSaving(false);
    if (result?.error) {
      setSavedMsg('エラーが発生しました');
    } else {
      setSavedMsg('保存しました ✓');
      setTimeout(() => setSavedMsg(''), 2500);
    }
  }

  // 合計金額（チェック済みのみ）
  const total = chores
    .filter((c) => states[c.id]?.checked)
    .reduce((sum, c) => sum + c.unit_price * (states[c.id]?.count ?? 1), 0);

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-bold">今日のお手伝い</h1>

      {/* 日付ピッカー */}
      <input
        type="date"
        value={date}
        max={todayJST()}
        onChange={(e) => setDate(e.target.value)}
        className="mb-5 w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* お手伝いリスト */}
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">読み込み中…</p>
      ) : chores.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          この日のお手伝いは登録されていません
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {chores.map((chore) => {
              const state = states[chore.id];
              return (
                <div
                  key={chore.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  {/* チェックボタン */}
                  <button
                    onClick={() => toggleCheck(chore.id)}
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      state?.checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    )}
                    aria-label={state?.checked ? 'チェック解除' : 'チェック'}
                  >
                    {state?.checked && (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* 名前・単価 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{chore.name}</p>
                    <p className="text-sm text-muted-foreground">{chore.unit_price}円／回</p>
                  </div>

                  {/* 回数ステッパー（チェック時のみ） */}
                  {state?.checked && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCount(chore.id, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-lg font-bold active:opacity-70"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-lg font-bold tabular-nums">
                        {state.count}
                      </span>
                      <button
                        onClick={() => updateCount(chore.id, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-lg font-bold active:opacity-70"
                      >
                        ＋
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 合計 */}
          {total > 0 && (
            <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-right">
              <span className="text-sm text-muted-foreground">今日の合計　</span>
              <span className="text-lg font-bold text-primary">{total.toLocaleString()}円</span>
            </div>
          )}

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow active:opacity-80 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存する'}
          </button>

          {savedMsg && (
            <p className="mt-3 text-center text-sm font-medium text-primary">{savedMsg}</p>
          )}
        </>
      )}
    </div>
  );
}
