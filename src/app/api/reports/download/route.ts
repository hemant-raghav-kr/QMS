import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generatePointLogPdf, PointTransactionWithMember } from '@/features/reports/services/pdfReportGenerator';
import { verifyCronOrAdminAuth } from '@/lib/auth/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyCronOrAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized report download.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportKey = searchParams.get('report_key');
    const reportId = searchParams.get('id');

    if (!reportKey && !reportId) {
      return NextResponse.json({ error: 'report_key or id parameter is required.' }, { status: 400 });
    }

    const supabase = getAdminClient();
    let query = supabase.from('weekly_reports').select('*');
    if (reportKey) {
      query = query.eq('report_key', reportKey);
    } else if (reportId) {
      query = query.eq('id', reportId);
    }

    let report = null;
    try {
      const { data } = await query.single();
      report = data;
    } catch {
      // Database unavailable or not found
    }

    let periodStart: Date;
    let periodEnd: Date;
    let finalKey = reportKey || 'weekly-point-report';
    let recipient = 'admin@quartzite.org';
    let totalAdditions = 0;
    let totalDeductions = 0;
    let netChange = 0;

    if (report) {
      periodStart = new Date(report.period_start);
      periodEnd = new Date(report.period_end);
      finalKey = report.report_key;
      recipient = report.email_recipient;
      totalAdditions = report.total_additions;
      totalDeductions = report.total_deductions;
      netChange = report.net_change;
    } else if (reportKey) {
      const { getWeekDateRange } = await import('@/features/reports/services/weeklyReportService');
      const parts = reportKey.split(':');
      const year = parseInt(parts[1] || '2026', 10);
      const week = parseInt(parts[2]?.replace('W', '') || '1', 10);
      const range = getWeekDateRange(year, week);
      periodStart = range.periodStart;
      periodEnd = range.periodEnd;
    } else {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    // Fetch transactions in period
    let transactions: PointTransactionWithMember[] = [];
    try {
      const { data: rawTransactions } = await supabase
        .from('point_transactions')
        .select(`
          *,
          user:profiles!point_transactions_user_id_fkey(id, full_name, email, role)
        `)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .order('created_at', { ascending: true });

      if (rawTransactions) {
        transactions = rawTransactions as unknown as PointTransactionWithMember[];
      }
    } catch {
      // Offline fallback
    }

    const pdfBuffer = generatePointLogPdf({
      reportKey: finalKey,
      periodStart,
      periodEnd,
      transactions,
      totalAdditions,
      totalDeductions,
      netChange,
      recipientEmail: recipient,
    });

    const filename = `${finalKey.replace(/[:]/g, '_')}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    console.error('Error in /api/reports/download:', err);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}
