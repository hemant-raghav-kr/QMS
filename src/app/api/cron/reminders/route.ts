import { NextRequest, NextResponse } from 'next/server';
import { processMeetingReminders } from '@/features/meetings/services/reminderService';
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

    const result = await processMeetingReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    console.error('Error in /api/cron/reminders:', err);
    return NextResponse.json(
      { error: 'Internal error processing meeting reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
