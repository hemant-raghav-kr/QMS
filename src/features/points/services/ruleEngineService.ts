import { createClient } from '@/lib/supabase/client';
import type { PointRule } from '@/types/database';
import { FEATURE_FLAGS } from '@/lib/config/features';

export interface RuleEvaluationResult {
  success: boolean;
  message?: string;
  transactionsCreated?: number;
  error?: string;
}

/**
 * Evaluates points rules for a finalized meeting's attendance records.
 * Relies on the PostgreSQL stored procedure process_meeting_points to guarantee
 * transactional consistency, idempotency, and audit trail generation.
 */
export async function evaluateMeetingAttendancePoints(
  meetingId: string,
  actorId?: string
): Promise<RuleEvaluationResult> {
  if (!FEATURE_FLAGS.ENABLE_AUTOMATIC_POINTS) {
    return {
      success: true,
      message: 'Automatic point evaluation is temporarily disabled.',
      transactionsCreated: 0,
    };
  }

  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc('process_meeting_points', {
      target_meeting_id: meetingId,
      p_actor_id: actorId || null,
    });

    if (rpcError) {
      console.warn('process_meeting_points RPC note:', rpcError.message);
      // Fallback: If RPC not found in schema or environment, we execute programmatic evaluation
      return await fallbackEvaluateAttendancePoints(meetingId, actorId);
    }

    return {
      success: true,
      message: 'Meeting attendance points evaluated and transactions recorded.',
    };
  } catch (err: unknown) {
    console.error('Error evaluating meeting attendance points:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to evaluate points.',
    };
  }
}

/**
 * Fallback evaluator if direct RPC is not available in local development.
 * Performs client-safe queries and inserts following the exact same idempotency keys.
 */
async function fallbackEvaluateAttendancePoints(
  meetingId: string,
  actorId?: string
): Promise<RuleEvaluationResult> {
  if (!FEATURE_FLAGS.ENABLE_AUTOMATIC_POINTS) {
    return {
      success: true,
      message: 'Automatic point evaluation is temporarily disabled.',
      transactionsCreated: 0,
    };
  }

  try {
    const supabase = createClient();

    const [{ data: meeting }, { data: attendanceList }, { data: rules }] = await Promise.all([
      supabase.from('meetings').select('id, title').eq('id', meetingId).single(),
      supabase.from('attendance').select('*').eq('meeting_id', meetingId),
      supabase.from('point_rules').select('*').eq('trigger_type', 'ATTENDANCE_STATUS').eq('active', true),
    ]);

    if (!meeting || !attendanceList || !rules) {
      return { success: false, error: 'Meeting, attendance, or rules not available.' };
    }

    let createdCount = 0;

    for (const record of attendanceList) {
      const matchingRule = rules.find((r) => r.condition_value === record.status);
      if (!matchingRule) continue;

      const idempotencyKey = `meeting:${meetingId}:user:${record.user_id}`;

      // Check if transaction already exists
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) continue;

      // Insert transaction
      const { data: tx, error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: record.user_id,
          amount: matchingRule.points,
          reason: `${matchingRule.name} — ${meeting.title}`,
          type: 'AUTOMATIC',
          rule_id: matchingRule.id,
          meeting_id: meetingId,
          idempotency_key: idempotencyKey,
          created_by: actorId || null,
        })
        .select('id')
        .single();

      if (txError || !tx) continue;

      createdCount++;

      // Create notification
      const notifTitle =
        matchingRule.points > 0
          ? `⭐ +${matchingRule.points} points earned`
          : matchingRule.points < 0
          ? `${matchingRule.points} points deduction`
          : 'Attendance Recorded';

      const notifMsg =
        matchingRule.points > 0
          ? `You received ${matchingRule.points} points for attending ${meeting.title}.`
          : matchingRule.points < 0
          ? `Your points changed by ${matchingRule.points} due to ${record.status} status in ${meeting.title}.`
          : `Attendance recorded as ${record.status} for ${meeting.title}.`;

      await supabase.from('notifications').insert({
        user_id: record.user_id,
        title: notifTitle,
        message: notifMsg,
        type: 'POINTS',
        read: false,
      });

      // Create audit log
      await supabase.from('audit_logs').insert({
        actor_id: actorId || null,
        action: 'AUTO_POINT_AWARDED',
        target_type: 'point_transactions',
        target_id: tx.id,
        metadata: {
          meeting_id: meetingId,
          user_id: record.user_id,
          status: record.status,
          amount: matchingRule.points,
          rule_name: matchingRule.name,
        } as unknown as import('@/types/database').Json,
      });
    }

    return {
      success: true,
      transactionsCreated: createdCount,
    };
  } catch (err) {
    console.error('Fallback evaluation failed:', err);
    return { success: false, error: 'Fallback point evaluation error' };
  }
}

/**
 * Retrieves the currently active rule for an attendance status
 */
export async function getAttendanceRule(status: string): Promise<PointRule | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('point_rules')
    .select('*')
    .eq('trigger_type', 'ATTENDANCE_STATUS')
    .eq('condition_value', status)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  return data;
}
