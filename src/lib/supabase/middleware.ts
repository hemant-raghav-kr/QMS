import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder.supabase.co';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-publishable-key';

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // If supabase is unconfigured (placeholder url), don't break local static builds
  if (
    supabaseUrl.includes('placeholder.supabase.co') ||
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('[YOUR_')
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const isProtectedPage = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/meetings') ||
    pathname.startsWith('/points') ||
    pathname.startsWith('/announcements') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin');

  // Unauthenticated user attempting to access protected route
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user attempting to visit login/signup
  if (user && isAuthPage && !pathname.startsWith('/reset-password')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Admin route protection: check role
  if (user && pathname.startsWith('/admin')) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profile = data as { role?: string } | null;

    if (!profile || (profile.role !== 'SUPER_ADMIN' && profile.role !== 'ADMIN')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
