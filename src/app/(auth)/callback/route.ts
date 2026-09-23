import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (requestUrl.origin.includes('localhost')
      ? requestUrl.origin
      : 'https://quartzitemanagementsystem.vercel.app');

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
