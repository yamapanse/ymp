import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase @supabase/ssr は Edge runtime で __dirname を参照するため、
 * middleware では使用しない。
 * セッションクッキーの存在確認のみ行い、JWT検証は Server Component に委ねる。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const PUBLIC_PATHS = ['/login', '/auth'];
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Supabase セッションクッキーの存在確認（sb-{ref}-auth-token*）
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  );

  // 未ログイン → /login へ
  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ログイン済み + /login → / へ（role判定は app/page.tsx で行う）
  if (hasSession && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)',
  ],
};
