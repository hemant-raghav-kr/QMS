import { getAdminClient } from '@/lib/supabase/admin';
import { generatePointLogPdf, PointTransactionWithMember } from './pdfReportGenerator';
import { sendEmail } from './emailService';
import type { WeeklyReport, WeeklyReportStatus } from '@/types/database';

export interface WeeklyReportResult {
  success: boolean;
  report?: WeeklyReport;
  pdfBase64?: string;
  isCached?: boolean;
  error?: string;
}

/**
 * Returns ISO week number and ISO week-numbering year for a given date
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Computes the UTC start (Monday 00:00:00) and end (Sunday 23:59:59.999) of an ISO week
 */
export function getWeekDateRange(year: number, week: number): { periodStart: Date; periodEnd: Date } {
  // Simple ISO week start calculation
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = new Date(simple);
  if (dow <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  isoWeekStart.setUTCHours(0, 0, 0, 0);

  const isoWeekEnd = new Date(isoWeekStart);
  isoWeekEnd.setUTCDate(isoWeekStart.getUTCDate() + 6);
  isoWeekEnd.setUTCHours(23, 59, 59, 999);

  return { periodStart: isoWeekStart, periodEnd: isoWeekEnd };
}

/**
 * Generates and archives the weekly point report with idempotency and email dispatch
 */
export async function generateWeeklyPointReport(options?: {
  targetDate?: Date;
  recipientEmail?: string | string[];
  force?: boolean;
}): Promise<WeeklyReportResult> {
  const supabase = getAdminClient();
  const date = options?.targetDate || new Date();
  const { year, week } = getIsoWeek(date);
  const reportKey = `weekly-point-report:${year}:W${week.toString().padStart(2, '0')}`;

  // 1. Resolve all admin recipients dynamically:
  // - If options.recipientEmail is explicitly passed, use it.
  // - Otherwise, query all users with role 'ADMIN' or 'SUPER_ADMIN' from profiles,
  //   and merge with any comma-separated emails from process.env.WEEKLY_REPORT_EMAIL.
  let recipients: string[] = [];

  if (options?.recipientEmail) {
    const raw = Array.isArray(options.recipientEmail)
      ? options.recipientEmail
      : options.recipientEmail.split(',');
    recipients = raw.map((e) => e.trim().toLowerCase()).filter(Boolean);
  } else {
    if (process.env.WEEKLY_REPORT_EMAIL) {
      recipients.push(
        ...process.env.WEEKLY_REPORT_EMAIL.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      );
    }

    try {
      const { data: adminProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['ADMIN', 'SUPER_ADMIN'])
        .not('email', 'is', null);

      if (!profileError && adminProfiles) {
        for (const p of adminProfiles) {
          if (p.email) {
            recipients.push(p.email.trim().toLowerCase());
          }
        }
      }
    } catch (err) {
      console.warn('[weeklyReportService] Notice: Could not query admin profiles:', err);
    }
  }

  // Deduplicate and ensure at least one recipient
  recipients = Array.from(new Set(recipients));
  if (recipients.length === 0) {
    recipients = ['admin@quartzite.org'];
  }
  const recipientSummary = recipients.join(', ');

  // 1. Idempotency Check: if report already exists and was successfully sent, return cached
  if (!options?.force) {
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('report_key', reportKey)
      .maybeSingle();

    if (existing && existing.email_status === 'SENT') {
      return {
        success: true,
        report: existing as WeeklyReport,
        isCached: true,
      };
    }
  }

  const { periodStart, periodEnd } = getWeekDateRange(year, week);

  // 2. Query all point transactions during this period
  const { data: rawTransactions, error: txError } = await supabase
    .from('point_transactions')
    .select(`
      *,
      user:profiles!point_transactions_user_id_fkey(id, full_name, email, role),
      creator:profiles!point_transactions_created_by_fkey(id, full_name, email),
      rule:point_rules!point_transactions_rule_id_fkey(id, name, trigger_type),
      meeting:meetings!point_transactions_meeting_id_fkey(id, title)
    `)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: true });

  let transactions: PointTransactionWithMember[] = [];
  if (txError) {
    console.warn(`[weeklyReportService] Notice: Point transactions query: ${txError.message}. Proceeding with clean audit log.`);
  } else if (rawTransactions) {
    transactions = rawTransactions as unknown as PointTransactionWithMember[];
  }

  // 3. Compute audit statistics
  let totalAdditions = 0;
  let totalDeductions = 0;

  for (const tx of transactions) {
    if (tx.amount >= 0) {
      totalAdditions += tx.amount;
    } else {
      totalDeductions += Math.abs(tx.amount);
    }
  }

  const netChange = totalAdditions - totalDeductions;

  // 4. Generate the Compliance PDF
  const pdfBuffer = generatePointLogPdf({
    reportKey,
    periodStart,
    periodEnd,
    transactions,
    totalAdditions,
    totalDeductions,
    netChange,
    recipientEmail: recipientSummary,
  });

  // 5. Send Transactional Email with PDF Attachment to all admin recipients
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <div style="background-color: #0f172a; padding: 16px 20px; border-radius: 8px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.05em;">QUARTZITE MANAGEMENT SYSTEM</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Official Weekly Point Audit Report</p>
      </div>

      <div style="margin-top: 24px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Weekly Summary (${year} - Week ${week})</h3>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
          Period: <strong>${periodStart.toISOString().split('T')[0]}</strong> to <strong>${periodEnd.toISOString().split('T')[0]}</strong>
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Total Transactions:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${transactions.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Points Awarded:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #10b981; text-align: right;">+${totalAdditions}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Points Deducted:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #ef4444; text-align: right;">-${totalDeductions}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">Net Change:</td>
            <td style="padding: 10px 0; font-weight: bold; font-size: 16px; color: ${netChange >= 0 ? '#10b981' : '#ef4444'}; text-align: right;">${netChange >= 0 ? '+' : ''}${netChange}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 20px; line-height: 1.5;">
        The complete point transaction log with itemized breakdowns and reason codes is attached to this email as a PDF document.
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        Quartzite Management System • Automated Audit Service • Key: ${reportKey}
      </div>
    </div>
  `;

  const emailRes = await sendEmail({
    to: recipients,
    subject: `[QMS Compliance] Weekly Point Log Audit — ${year} Week ${week}`,
    html: emailHtml,
    attachments: [
      {
        filename: `${reportKey}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  const emailStatus: WeeklyReportStatus = emailRes.success ? 'SENT' : 'FAILED';

  // 6. Record or update in weekly_reports archive
  const reportPayload = {
    report_key: reportKey,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_transactions: transactions.length,
    total_additions: totalAdditions,
    total_deductions: totalDeductions,
    net_change: netChange,
    email_recipient: recipientSummary,
    email_status: emailStatus,
    sent_at: emailStatus === 'SENT' ? new Date().toISOString() : null,
    error_message: emailRes.error || null,
    metadata: {
      pdfByteLength: pdfBuffer.byteLength,
      isoYear: year,
      isoWeek: week,
      simulatedEmail: !!emailRes.simulated,
      messageId: emailRes.messageId || null,
      provider: emailRes.provider || (emailRes.simulated ? 'simulated' : 'resend'),
      recipients,
    },
  };

  const { data: savedReport, error: upsertError } = await supabase
    .from('weekly_reports')
    .upsert(reportPayload, { onConflict: 'report_key' })
    .select()
    .single();

  if (upsertError) {
    console.warn('[weeklyReportService] Notice: Could not save archive record in database:', upsertError.message);
    return {
      success: true,
      report: {
        id: `local-${Date.now()}`,
        ...reportPayload,
        created_at: new Date().toISOString(),
      } as WeeklyReport,
      pdfBase64: pdfBuffer.toString('base64'),
    };
  }

  return {
    success: true,
    report: savedReport as WeeklyReport,
    pdfBase64: pdfBuffer.toString('base64'),
  };
}

/**
 * Retrieves archived weekly reports
 */
export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('period_end', { ascending: false });

  if (error) {
    console.error('Error fetching weekly reports:', error);
    return [];
  }

  return (data as WeeklyReport[]) || [];
}
