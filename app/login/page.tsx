'use client';

import { useState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* アイコン + タイトル */}
      <div className="mb-8 text-center">
        <div className="mb-3 text-6xl">💰</div>
        <h1 className="text-2xl font-bold text-foreground">おこづかい帳</h1>
        <p className="mt-1 text-sm text-muted-foreground">ログインしてください</p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="example@mail.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="パスワード"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
