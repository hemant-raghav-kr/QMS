import { createClient } from '@/lib/supabase/client';
import type { AuditLog, Profile } from '@/types/database';

export interface AuditLogWithActor extends AuditLog {
  actor?: Profile | null;
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogWithActor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:profiles!audit_logs_actor_id_fkey(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return (data as unknown as AuditLogWithActor[]) || [];
}

export async function logAuditEvent(params: {
  action: string;
  target_type: string;
  target_id: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      actor_id: user?.id || null,
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id,
      metadata: (params.metadata || {}) as unknown as import('@/types/database').Json,
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
