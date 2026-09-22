import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyPointReport } from '@/features/reports/services/weeklyReportService';
import { verifyCronOrAdminAuth } from '@/lib/auth/cronAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyCronOrAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized cron trigger.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const recipient = searchParams.get('recipient') || undefined;

    const result = await generateWeeklyPointReport({
      force,
      recipientEmail: recipient,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Report generation failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: result.report,
      isCached: result.isCached,
    });
  } catch (err: unknown) {
    console.error('Error in /api/cron/weekly-report:', err);
    return NextResponse.json(
      { error: 'Internal error executing weekly report generation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
