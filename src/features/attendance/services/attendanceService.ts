import { createClient } from '@/lib/supabase/client';
import type { Attendance, AttendanceStatus, Profile, Meeting } from '@/types/database';
import { createNotification } from '@/features/notifications/services/notificationService';
import { logAuditEvent } from '@/features/audit/services/auditService';

export interface AttendanceWithDetails extends Attendance {
  user?: Profile | null;
  meeting?: Meeting | null;
  overridden_by_profile?: Profile | null;
  sessionsCount?: number;
  totalDurationSeconds?: number;
  totalDurationMinutes?: number;
  participationPercentage?: number;
}

export async function getAttendanceForUser(userId: string): Promise<AttendanceWithDetails[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      meeting:meetings(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching attendance for user:', error);
    return [];
  }

  return (data as unknown as AttendanceWithDetails[]) || [];
}

/**
 * Retrieves all attendance records with session metrics (durations, % participation, re-joins)
 */
export async function getAllAttendanceWithMetrics(meetingIdFilter?: string): Promise<AttendanceWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from('attendance')
    .select(`
      *,
      user:profiles!attendance_user_id_fkey(*),
      meeting:meetings(*),
      overridden_by_profile:profiles!attendance_overridden_by_fkey(*)
    `)
    .order('created_at', { ascending: false });

  if (meetingIdFilter) {
    query = query.eq('meeting_id', meetingIdFilter);
  }

  const { data: records, error: attError } = await query;

  if (attError || !records) {
    if (attError) {
      console.error(`Error fetching attendance records: [${attError.code || 'UNKNOWN'}] ${attError.message || 'Unknown error'}${attError.details ? ` (${attError.details})` : ''}`);
    }
    return [];
  }

  // Fetch all attendance sessions to compute accurate metrics
  const sessionQuery = supabase
    .from('meeting_attendance_sessions')
    .select('meeting_id, user_id, duration_seconds');

  if (meetingIdFilter) {
    sessionQuery.eq('meeting_id', meetingIdFilter);
  }

  const { data: sessions } = await sessionQuery;

  // Build aggregated map by meeting_id:user_id
  const sessionMetrics = new Map<string, { totalSeconds: number; count: number }>();
  if (sessions) {
    sessions.forEach((sess) => {
      const key = `${sess.meeting_id}:${sess.user_id}`;
      const existing = sessionMetrics.get(key) || { totalSeconds: 0, count: 0 };
      existing.totalSeconds += sess.duration_seconds || 0;
      existing.count += 1;
      sessionMetrics.set(key, existing);
    });
  }

  // Combine attendance with session metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map((rec: any) => {
    const key = `${rec.meeting_id}:${rec.user_id}`;
    const metrics = sessionMetrics.get(key) || { totalSeconds: 0, count: 0 };
    const scheduledMinutes = rec.meeting?.duration_minutes || 60;
    const totalMinutes = Math.round(metrics.totalSeconds / 60);
    const participationPercentage = Math.min(
      100,
      Math.round((totalMinutes / scheduledMinutes) * 100)
    );

    return {
      ...rec,
      sessionsCount: metrics.count,
      totalDurationSeconds: metrics.totalSeconds,
      totalDurationMinutes: totalMinutes,
      participationPercentage: metrics.totalSeconds > 0 ? participationPercentage : 0,
    };
  });
}

export async function getAllAttendance(): Promise<AttendanceWithDetails[]> {
  return getAllAttendanceWithMetrics();
}

/**
 * Overrides an attendance record with atomic point reversal and recalculation.
 * Calls override_attendance_with_points stored procedure or programmatic fallback.
 */
export async function overrideAttendance(params: {
  meetingId: string;
  userId: string;
  newStatus: AttendanceStatus;
  reason: string;
}): Promise<{ success: boolean; netChange?: number; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Authentication required.' };
    }

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: 'A reason is required to override attendance.' };
    }

    // Attempt RPC execution
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc(
        'override_attendance_with_points',
        {
          p_meeting_id: params.meetingId,
          p_user_id: params.userId,
          p_new_status: params.newStatus,
          p_reason: params.reason.trim(),
          p_admin_id: currentUser.id,
        }
      );

      if (!rpcErr && rpcResult && rpcResult.success) {
        return { success: true, netChange: rpcResult.net_change };
      }
    } catch (rpcCatch) {
      console.warn('RPC override_attendance_with_points failed, falling back:', rpcCatch);
    }

    // Programmatic Fallback:
    // 1. Fetch meeting & current attendance
    const [{ data: meeting }, { data: currentAtt }] = await Promise.all([
      supabase.from('meetings').select('title').eq('id', params.meetingId).single(),
      supabase
        .from('attendance')
        .select('*')
        .eq('meeting_id', params.meetingId)
        .eq('user_id', params.userId)
        .single(),
    ]);

    if (!meeting || !currentAtt) {
      return { success: false, error: 'Meeting or attendance record not found.' };
    }

    const oldStatus = currentAtt.status;
    let netChange = 0;

    // 2. Update attendance record
    await supabase
      .from('attendance')
      .update({
        status: params.newStatus,
        original_status: currentAtt.original_status || oldStatus,
        overridden_by: currentUser.id,
        override_reason: params.reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('meeting_id', params.meetingId)
      .eq('user_id', params.userId);

    // 3. Find any active non-reversed point transaction for this meeting and user
    const { data: oldTxs } = await supabase
      .from('point_transactions')
      .select('id, amount, reason')
      .eq('meeting_id', params.meetingId)
      .eq('user_id', params.userId)
      .in('type', ['AUTOMATIC', 'ADJUSTMENT'])
      .order('created_at', { ascending: false });

    const activeOldTx = oldTxs?.[0];

    // If an active transaction exists, create a reversal
    if (activeOldTx && activeOldTx.amount !== 0) {
      const reversalAmount = -activeOldTx.amount;
      await supabase.from('point_transactions').insert({
        user_id: params.userId,
        amount: reversalAmount,
        reason: `Reversal of ${activeOldTx.amount} pts (${oldStatus} -> ${params.newStatus}): ${params.reason.trim()}`,
        type: 'REVERSAL',
        reversal_of_id: activeOldTx.id,
        meeting_id: params.meetingId,
        created_by: currentUser.id,
      });
      netChange += reversalAmount;
    }

    // 4. Find active rule for new status
    const { data: newRule } = await supabase
      .from('point_rules')
      .select('id, name, points')
      .eq('trigger_type', 'ATTENDANCE_STATUS')
      .eq('condition_value', params.newStatus)
      .eq('active', true)
      .maybeSingle();

    // 5. Create new transaction if new status has points
    if (newRule && newRule.points !== 0) {
      await supabase.from('point_transactions').insert({
        user_id: params.userId,
        amount: newRule.points,
        reason: `${newRule.name} (Override: ${params.newStatus}) — ${meeting.title}`,
        type: 'ADJUSTMENT',
        rule_id: newRule.id,
        meeting_id: params.meetingId,
        created_by: currentUser.id,
      });
      netChange += newRule.points;
    }

    // 6. Notify member
    await createNotification({
      user_id: params.userId,
      title: 'Attendance & Points Corrected',
      message: `Your attendance for "${meeting.title}" was updated from ${oldStatus} to ${params.newStatus}. Net point adjustment: ${netChange > 0 ? '+' : ''}${netChange} points. Reason: ${params.reason.trim()}`,
      type: 'POINTS',
    });

    // 7. Audit log
    await logAuditEvent({
      action: 'ATTENDANCE_OVERRIDE',
      target_type: 'attendance',
      target_id: `${params.meetingId}:${params.userId}`,
      metadata: {
        meeting_id: params.meetingId,
        meeting_title: meeting.title,
        user_id: params.userId,
        old_status: oldStatus,
        new_status: params.newStatus,
        reason: params.reason.trim(),
        net_change: netChange,
      },
    });

    return { success: true, netChange };
  } catch (err: unknown) {
    console.error('Error in overrideAttendance:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Attendance override failed.' };
  }
}
