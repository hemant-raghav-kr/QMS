import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { getAppUrl } from '@/lib/config/app-url';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Production MUST always resolve to the canonical production URL (https://quartzitemanagementsystem.vercel.app).
  // Local development intentionally retains localhost if invoked in a local dev environment.
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalOrigin = requestUrl.origin.includes('localhost') || requestUrl.origin.includes('127.0.0.1');
  const appBase = isDev && isLocalOrigin ? requestUrl.origin : getAppUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, appBase));
    }
  }

  // Return to login with error param if code exchange fails
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', appBase));
}
