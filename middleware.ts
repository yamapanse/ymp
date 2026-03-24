import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションリフレッシュ（必須: getUser() を必ず呼ぶこと）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 未ログインの場合は /login へリダイレクト
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ログイン済みで /login にアクセスした場合は role別ページへ
  if (user && pathname === '/login') {
    const supabase2 = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: profile } = await supabase2
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === 'parent' ? '/parent' : '/child/today';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスに適用:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico / manifest / icons / sw など PWA ファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)',
  ],
};
