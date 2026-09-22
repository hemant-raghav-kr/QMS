import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database';

export interface AuthVerificationResult {
  authorized: boolean;
  reason?: string;
  source?: 'CRON_SECRET' | 'ADMIN_SESSION';
  userId?: string;
}

/**
 * Validates that an API request originates from either:
 * 1. An authorized scheduled task or webhook possessing the Bearer CRON_SECRET token, or
 * 2. An authenticated Supabase session of an ADMIN or SUPER_ADMIN user.
 *
 * In production, if neither is valid, returns authorized: false.
 */
export async function verifyCronOrAdminAuth(request: NextRequest): Promise<AuthVerificationResult> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 1. Verify CRON_SECRET if configured
  if (cronSecret && cronSecret.trim().length > 0) {
    if (authHeader === `Bearer ${cronSecret.trim()}`) {
      return { authorized: true, source: 'CRON_SECRET' };
    }
  }

  // 2. Verify authenticated Admin/SuperAdmin session cookies
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile && isAdmin(profile.role as UserRole)) {
        return { authorized: true, source: 'ADMIN_SESSION', userId: user.id };
      }
    }
  } catch {
    // Session retrieval error or offline client
  }

  return {
    authorized: false,
    reason: 'Unauthorized. Requires Bearer CRON_SECRET or an authenticated Admin session.',
  };
}
