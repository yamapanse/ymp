'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createChildAccount, updateChildProfile } from './actions';

type Child = { id: string; name: string; base_allowance: number | null };

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [editForm, setEditForm] = useState({ name: '', baseAllowance: '' });
  const [saving, setSaving] = useState(false);

  // 新規作成フォーム
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    baseAllowance: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function fetchChildren() {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, name, base_allowance')
      .eq('role', 'child')
      .order('name');
    setChildren(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchChildren();
  }, []);

  function openEdit(c: Child) {
    setEditTarget(c);
    setEditForm({ name: c.name, baseAllowance: String(c.base_allowance ?? 0) });
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    await updateChildProfile(editTarget.id, {
      name: editForm.name,
      baseAllowance: Number(editForm.baseAllowance),
    });
    setEditTarget(null);
    await fetchChildren();
    setSaving(false);
  }

  async function handleCreate() {
    setCreateError('');
    if (!createForm.email || !createForm.password || !createForm.name) {
      setCreateError('すべての項目を入力してください');
      return;
    }
    setCreating(true);
    const result = await createChildAccount({
      email: createForm.email,
      password: createForm.password,
      name: createForm.name,
      baseAllowance: Number(createForm.baseAllowance || 0),
    });
    if (result?.error) {
      setCreateError(result.error);
    } else {
      setShowCreate(false);
      setCreateForm({ email: '', password: '', name: '', baseAllowance: '' });
      await fetchChildren();
    }
    setCreating(false);
  }

  return (
    <div className="px-4 py-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold">子供アカウント管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          ＋ 新規追加
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">読み込み中…</p>
      ) : children.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">子供アカウントがありません</p>
      ) : (
        <div className="space-y-3">
          {children.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    基本料金: {(c.base_allowance ?? 0).toLocaleString()}円／月
                  </p>
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
                >
                  編集
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="w-full max-w-app rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-bold">プロフィール編集</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  表示名
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  基本料金（円／月）
                </label>
                <input
                  type="number"
                  value={editForm.baseAllowance}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, baseAllowance: e.target.value }))
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditTarget(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? '保存中…' : '保存する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-app rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-bold">子供アカウント作成</h2>
            <div className="space-y-3">
              {[
                { label: '表示名', key: 'name', type: 'text', placeholder: '例: 太郎' },
                { label: 'メールアドレス', key: 'email', type: 'email', placeholder: 'taro@example.com' },
                { label: 'パスワード', key: 'password', type: 'password', placeholder: '6文字以上' },
                { label: '基本料金（円／月）', key: 'baseAllowance', type: 'number', placeholder: '例: 500' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={createForm[key as keyof typeof createForm]}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              {createError && (
                <p className="text-xs text-destructive">{createError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {creating ? '作成中…' : '作成する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
