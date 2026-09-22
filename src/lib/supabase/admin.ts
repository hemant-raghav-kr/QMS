import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://placeholder.supabase.co';

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'placeholder-secret-key';

  adminClient = createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
