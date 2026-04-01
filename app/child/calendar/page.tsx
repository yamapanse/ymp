'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const TZ = 'Asia/Tokyo';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function todayJST() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

type DayRecord = { name: string; count: number; unit_price_snapshot: number };
type ModalData = { date: string; records: DayRecord[] };

export default function CalendarPage() {
  const router = useRouter();
  const today = todayJST();
  const [currentMonth, setCurrentMonth] = useState(() => parseISO(today.slice(0, 7) + '-01'));
  const [dotDates, setDotDates] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{
    base: number;
    chore: number;
    total: number;
    paidAt: string | null;
  } | null>(null);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [loading, setLoading] = useState(true);

  const yearMonth = formatInTimeZone(currentMonth, TZ, 'yyyy-MM');

  const fetchMonth = useCallback(async (month: Date) => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ym = formatInTimeZone(month, TZ, 'yyyy-MM');
    const from = `${ym}-01`;
    const to = formatInTimeZone(endOfMonth(month), TZ, 'yyyy-MM-dd');

    const [{ data: records }, { data: profile }, { data: monthlySummary }] = await Promise.all([
      supabase
        .from('chore_records')
        .select('date, count, unit_price_snapshot')
        .eq('child_id', user.id)
        .gte('date', from)
        .lte('date', to),
      supabase
        .from('profiles')
        .select('base_allowance')
        .eq('id', user.id)
        .single(),
      supabase
        .from('monthly_summaries')
        .select('paid_at')
        .eq('child_id', user.id)
        .eq('year_month', ym)
        .maybeSingle(),
    ]);

    const dots = new Set((records ?? []).map((r: any) => r.date));
    setDotDates(dots);

    const choreTotal = (records ?? []).reduce(
      (sum, r) => sum + r.unit_price_snapshot * r.count,
      0
    );
    const base = profile?.base_allowance ?? 0;
    setSummary({
      base,
      chore: choreTotal,
      total: base + choreTotal,
      paidAt: monthlySummary?.paid_at ?? null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonth(currentMonth);
    setModal(null);
  }, [currentMonth, fetchMonth]);

  async function openDay(dateStr: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawRecords } = (await supabase
      .from('chore_records')
      .select('chore_master_id, count, unit_price_snapshot')
      .eq('child_id', user.id)
      .eq('date', dateStr)) as {
      data: { chore_master_id: string; count: number; unit_price_snapshot: number }[] | null;
    };

    // is_active に関わらずIDで直接取得（履歴表示のため）
    const masterIds = Array.from(new Set((rawRecords ?? []).map((r) => r.chore_master_id)));
    const { data: masters } = masterIds.length
      ? await supabase
          .from('chore_masters')
          .select('id, name')
          .in('id', masterIds)
      : { data: [] as { id: string; name: string }[] };

    const masterNameMap = new Map((masters ?? []).map((m) => [m.id, m.name]));

    const records: DayRecord[] = (rawRecords ?? []).map((r) => ({
      name: masterNameMap.get(r.chore_master_id) ?? '不明',
      count: r.count,
      unit_price_snapshot: r.unit_price_snapshot,
    }));

    setModal({ date: dateStr, records });
  }

  // カレンダー構築
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 先頭の空白数（日曜=0）

  return (
    <div className="px-4 py-5">
      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">{yearMonth.replace('-', '年')}月</h1>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          disabled={yearMonth >= today.slice(0, 7)}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-secondary disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'py-1 text-xs font-medium',
              i === 0 && 'text-red-500',
              i === 6 && 'text-blue-500'
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7">
        {/* 先頭パディング */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = formatInTimeZone(day, TZ, 'yyyy-MM-dd');
          const dayNum = day.getDate();
          const dow = getDay(day);
          const hasRecord = dotDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (hasRecord) {
                  openDay(dateStr);
                } else {
                  router.push(`/child/today?date=${dateStr}`);
                }
              }}
              className="flex flex-col items-center py-2 rounded-xl active:bg-secondary"
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm',
                  isToday && 'bg-primary text-primary-foreground font-bold',
                  !isToday && dow === 0 && 'text-red-500',
                  !isToday && dow === 6 && 'text-blue-500'
                )}
              >
                {dayNum}
              </span>
              <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', hasRecord ? 'bg-primary' : 'invisible')} />
            </button>
          );
        })}
      </div>

      {/* 月次集計 */}
      {!loading && summary && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">基本料金</span>
            <span>{summary.base.toLocaleString()}円</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">お手伝い合計</span>
            <span>{summary.chore.toLocaleString()}円</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <span>合計金額</span>
            <span className="text-primary">{summary.total.toLocaleString()}円</span>
          </div>
          {summary.paidAt && (
            <div className="flex justify-end">
              <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                支給済み
              </span>
            </div>
          )}
        </div>
      )}

      {/* 日別内訳モーダル */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-app rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{modal.date}</h2>
              <button onClick={() => setModal(null)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {modal.records.length === 0 ? (
              <p className="text-sm text-muted-foreground">記録がありません</p>
            ) : (
              <div className="space-y-2">
                {modal.records.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {r.name} × {r.count}回
                    </span>
                    <span className="font-medium">
                      {(r.unit_price_snapshot * r.count).toLocaleString()}円
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>小計</span>
                  <span>
                    {modal.records
                      .reduce((s, r) => s + r.unit_price_snapshot * r.count, 0)
                      .toLocaleString()}
                    円
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setModal(null);
                router.push(`/child/today?date=${modal.date}`);
              }}
              className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-medium active:bg-secondary"
            >
              この日を編集する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
