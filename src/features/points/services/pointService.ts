import { createClient } from '@/lib/supabase/client';
import type {
  PointTransaction,
  PointRule,
  Profile,
  Meeting,
  PointTransactionType,
} from '@/types/database';
import { createNotification } from '@/features/notifications/services/notificationService';
import { logAuditEvent } from '@/features/audit/services/auditService';

export interface PointTransactionWithDetails extends PointTransaction {
  user?: Profile | null;
  rule?: PointRule | null;
  meeting?: Meeting | null;
  creator?: Profile | null;
  reversal_of?: PointTransaction | null;
}

export interface UserPointsSummary {
  totalPoints: number;
  pointsEarned: number;
  pointsDeducted: number;
  transactionsCount: number;
}

/**
 * Calculates current dynamic points summary from the immutable transaction ledger.
 * Total points is strictly SUM(amount).
 */
export async function getUserPointsSummary(userId: string): Promise<UserPointsSummary> {
  const transactions = await getUserTransactions(userId);

  let totalPoints = 0;
  let pointsEarned = 0;
  let pointsDeducted = 0;

  transactions.forEach((tx) => {
    totalPoints += tx.amount;
    if (tx.amount > 0) {
      pointsEarned += tx.amount;
    } else if (tx.amount < 0) {
      pointsDeducted += Math.abs(tx.amount);
    }
  });

  return {
    totalPoints,
    pointsEarned,
    pointsDeducted,
    transactionsCount: transactions.length,
  };
}

/**
 * Retrieves all transactions for a specific user
 */
export async function getUserTransactions(userId: string): Promise<PointTransactionWithDetails[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('point_transactions')
    .select(`
      *,
      rule:point_rules(*),
      meeting:meetings(*),
      creator:profiles!point_transactions_created_by_fkey(*),
      reversal_of:point_transactions!reversal_of_id(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching user transactions: [${error.code || 'UNKNOWN'}] ${error.message || 'Unknown error'}${error.details ? ` (${error.details})` : ''}`);
    return [];
  }

  return (data as unknown as PointTransactionWithDetails[]) || [];
}

/**
 * Retrieves all transactions organization-wide for administrators
 */
export async function getAllTransactions(): Promise<PointTransactionWithDetails[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('point_transactions')
    .select(`
      *,
      user:profiles!point_transactions_user_id_fkey(*),
      rule:point_rules(*),
      meeting:meetings(*),
      creator:profiles!point_transactions_created_by_fkey(*),
      reversal_of:point_transactions!reversal_of_id(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching all transactions: [${error.code || 'UNKNOWN'}] ${error.message || 'Unknown error'}${error.details ? ` (${error.details})` : ''}`);
    return [];
  }

  return (data as unknown as PointTransactionWithDetails[]) || [];
}

/**
 * Creates a manual point addition, deduction, or adjustment transaction.
 * Generates audit log and member notification.
 */
export async function createPointTransaction(params: {
  user_id: string;
  amount: number;
  reason?: string;
  type?: PointTransactionType;
  rule_id?: string;
  meeting_id?: string;
}): Promise<{ success: boolean; data?: PointTransaction; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Authentication required.' };
    }

    if (params.amount === 0) {
      return { success: false, error: 'Point amount must be non-zero.' };
    }

    const isPositive = params.amount > 0;
    const finalReason = params.reason && params.reason.trim()
      ? params.reason.trim()
      : isPositive
      ? 'Administrative point award'
      : 'Administrative point deduction';

    const txType: PointTransactionType = params.type || 'MANUAL';

    const { data: newTx, error: insertError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: params.user_id,
        amount: params.amount,
        reason: finalReason,
        type: txType,
        rule_id: params.rule_id || null,
        meeting_id: params.meeting_id || null,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (insertError || !newTx) {
      return { success: false, error: insertError?.message || 'Failed to record transaction.' };
    }

    // Member notification
    const notifTitle = isPositive
      ? `⭐ +${params.amount} points awarded`
      : `${params.amount} points adjustment`;
    const notifMessage = isPositive
      ? `An administrator awarded you ${params.amount} points. Reason: ${finalReason}`
      : `Your points changed by ${params.amount}. Reason: ${finalReason}`;

    await createNotification({
      user_id: params.user_id,
      title: notifTitle,
      message: notifMessage,
      type: 'POINTS',
    });

    // Audit log
    await logAuditEvent({
      action: isPositive ? 'MANUAL_POINT_ADDITION' : 'MANUAL_POINT_DEDUCTION',
      target_type: 'point_transactions',
      target_id: newTx.id,
      metadata: {
        user_id: params.user_id,
        amount: params.amount,
        reason: finalReason,
        type: txType,
        rule_id: params.rule_id || null,
        meeting_id: params.meeting_id || null,
      },
    });

    return { success: true, data: newTx };
  } catch (err: unknown) {
    console.error('Error creating point transaction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Transaction error' };
  }
}

/**
 * Safely reverses a prior transaction by creating an offsetting -amount transaction.
 * Preserves historical transactions intact without deletion.
 */
export async function reversePointTransaction(params: {
  transaction_id: string;
  reason: string;
}): Promise<{ success: boolean; data?: PointTransaction; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: 'Authentication required.' };
    }

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: 'A reason is required to reverse a transaction.' };
    }

    // 1. Fetch original transaction
    const { data: origTx, error: fetchError } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('id', params.transaction_id)
      .single();

    if (fetchError || !origTx) {
      return { success: false, error: 'Original transaction not found.' };
    }

    // 2. Prevent reversing a reversal
    if (origTx.type === 'REVERSAL') {
      return { success: false, error: 'Cannot reverse an existing reversal transaction.' };
    }

    // 3. Check if already reversed
    const { data: existingReversal } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('reversal_of_id', origTx.id)
      .maybeSingle();

    if (existingReversal) {
      return { success: false, error: 'This transaction has already been reversed.' };
    }

    const reversalAmount = -origTx.amount;
    const reversalReason = `Reversal of ${origTx.amount > 0 ? '+' : ''}${origTx.amount} pts: ${params.reason.trim()}`;

    // 4. Insert reversal transaction
    const { data: reversalTx, error: insertError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: origTx.user_id,
        amount: reversalAmount,
        reason: reversalReason,
        type: 'REVERSAL',
        reversal_of_id: origTx.id,
        rule_id: origTx.rule_id,
        meeting_id: origTx.meeting_id,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (insertError || !reversalTx) {
      return { success: false, error: insertError?.message || 'Failed to record reversal.' };
    }

    // 5. Notify member
    await createNotification({
      user_id: origTx.user_id,
      title: 'Points Transaction Reversal',
      message: `Your points changed by ${reversalAmount > 0 ? '+' : ''}${reversalAmount} due to a reversal. Reason: ${params.reason.trim()}`,
      type: 'POINTS',
    });

    // 6. Audit log
    await logAuditEvent({
      action: 'TRANSACTION_REVERSAL',
      target_type: 'point_transactions',
      target_id: reversalTx.id,
      metadata: {
        original_transaction_id: origTx.id,
        original_amount: origTx.amount,
        reversal_amount: reversalAmount,
        user_id: origTx.user_id,
        reason: params.reason.trim(),
      },
    });

    return { success: true, data: reversalTx };
  } catch (err: unknown) {
    console.error('Error reversing transaction:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Reversal error' };
  }
}

/**
 * Retrieves all point rules
 */
export async function getPointRules(): Promise<PointRule[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('point_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching point rules:', error);
    return [];
  }

  return data || [];
}

/**
 * Creates a new configurable point rule
 */
export async function createPointRule(params: {
  name: string;
  description?: string;
  trigger_type: string;
  condition_value?: string;
  points: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('point_rules').insert({
    name: params.name,
    description: params.description || null,
    trigger_type: params.trigger_type,
    condition_value: params.condition_value || null,
    points: params.points,
    active: true,
    created_by: user?.id || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: 'CREATE_POINT_RULE',
    target_type: 'point_rules',
    target_id: params.name,
    metadata: {
      name: params.name,
      trigger_type: params.trigger_type,
      condition_value: params.condition_value,
      points: params.points,
    },
  });

  return { success: true };
}

/**
 * Updates an existing point rule
 */
export async function updatePointRule(
  id: string,
  params: {
    name?: string;
    description?: string | null;
    trigger_type?: string;
    condition_value?: string | null;
    points?: number;
    active?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('point_rules')
    .update({
      ...params,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: 'UPDATE_POINT_RULE',
    target_type: 'point_rules',
    target_id: id,
    metadata: params,
  });

  return { success: true };
}

/**
 * Toggles point rule active/inactive status
 */
export async function togglePointRuleStatus(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  return updatePointRule(id, { active });
}

/**
 * Safe rule deletion: if rule has been used in point transactions, it is deactivated instead of deleted
 */
export async function deletePointRule(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = createClient();

  // Check if rule is referenced in transactions
  const { count } = await supabase
    .from('point_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', id);

  if (count && count > 0) {
    // Deactivate instead to preserve historical integrity
    await updatePointRule(id, { active: false });
    return {
      success: true,
      message: 'Rule has historical transactions and was deactivated rather than deleted to protect audit history.',
    };
  }

  const { error } = await supabase.from('point_rules').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: 'Rule deleted successfully.' };
}
