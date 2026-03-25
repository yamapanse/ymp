'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/client';
import { addChoreMaster, deactivateChoreMaster, reviseUnitPrice } from './actions';

const TZ = 'Asia/Tokyo';
function todayJST() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

type Child = { id: string; name: string };
type Master = { id: string; name: string; unit_price: number; valid_from: string };

export default function MastersPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規追加フォーム
  const [addForm, setAddForm] = useState({ name: '', unitPrice: '', validFrom: todayJST() });
  const [adding, setAdding] = useState(false);

  // 単価改定モーダル
  const [reviseTarget, setReviseTarget] = useState<Master | null>(null);
  const [reviseForm, setReviseForm] = useState({ newPrice: '', effectiveDate: todayJST() });
  const [revising, setRevising] = useState(false);

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

  const fetchMasters = useCallback(async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('chore_masters')
      .select('id, name, unit_price, valid_from')
      .eq('child_id', childId)
      .eq('is_active', true)
      .is('valid_to', null)
      .order('name');
    setMasters(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMasters(selectedChild);
  }, [selectedChild, fetchMasters]);

  async function handleAdd() {
    if (!addForm.name || !addForm.unitPrice) return;
    setAdding(true);
    await addChoreMaster({
      childId: selectedChild,
      name: addForm.name,
      unitPrice: Number(addForm.unitPrice),
      validFrom: addForm.validFrom,
    });
    setAddForm({ name: '', unitPrice: '', validFrom: todayJST() });
    await fetchMasters(selectedChild);
    setAdding(false);
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`「${name}」を無効化しますか？`)) return;
    await deactivateChoreMaster(id);
    await fetchMasters(selectedChild);
  }

  async function handleRevise() {
    if (!reviseTarget || !reviseForm.newPrice) return;
    setRevising(true);
    await reviseUnitPrice(reviseTarget.id, Number(reviseForm.newPrice), reviseForm.effectiveDate);
    setReviseTarget(null);
    await fetchMasters(selectedChild);
    setRevising(false);
  }

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-bold">お手伝いマスタ管理</h1>

      {/* 子供選択タブ */}
      <div className="mb-5 flex gap-2 overflow-x-auto">
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

      {/* 新規追加フォーム */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">新規追加</p>
        <div className="space-y-2">
          <input
            placeholder="お手伝い名（例: 箸ならべ）"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="単価（円）"
              value={addForm.unitPrice}
              onChange={(e) => setAddForm((f) => ({ ...f, unitPrice: e.target.value }))}
              className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="date"
              value={addForm.validFrom}
              onChange={(e) => setAddForm((f) => ({ ...f, validFrom: e.target.value }))}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addForm.name || !addForm.unitPrice || !selectedChild}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {adding ? '追加中…' : '追加する'}
          </button>
        </div>
      </div>

      {/* マスタ一覧 */}
      {loading ? (
        <p className="py-6 text-center text-muted-foreground">読み込み中…</p>
      ) : masters.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          登録されているお手伝いがありません
        </p>
      ) : (
        <div className="space-y-3">
          {masters.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.unit_price}円／回　{m.valid_from}〜
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReviseTarget(m);
                    setReviseForm({ newPrice: '', effectiveDate: todayJST() });
                  }}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium"
                >
                  単価改定
                </button>
                <button
                  onClick={() => handleDeactivate(m.id, m.name)}
                  className="flex-1 rounded-lg border border-destructive/50 py-1.5 text-xs font-medium text-destructive"
                >
                  無効化
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 単価改定モーダル */}
      {reviseTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setReviseTarget(null)}
        >
          <div
            className="w-full max-w-app rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 font-bold">単価改定</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {reviseTarget.name}（現在 {reviseTarget.unit_price}円）
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  新しい単価（円）
                </label>
                <input
                  type="number"
                  value={reviseForm.newPrice}
                  onChange={(e) => setReviseForm((f) => ({ ...f, newPrice: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="例: 20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  適用開始日
                </label>
                <input
                  type="date"
                  value={reviseForm.effectiveDate}
                  onChange={(e) => setReviseForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setReviseTarget(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleRevise}
                  disabled={revising || !reviseForm.newPrice}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {revising ? '処理中…' : '改定する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
