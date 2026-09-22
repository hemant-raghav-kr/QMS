import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToUser } from '@/features/notifications/services/pushService';
import { verifyCronOrAdminAuth } from '@/lib/auth/cronAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyCronOrAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized push dispatch.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, title, message, url } = body;

    if (!user_id || !title || !message) {
      return NextResponse.json(
        { error: 'user_id, title, and message are required.' },
        { status: 400 }
      );
    }

    const result = await sendPushNotificationToUser(user_id, {
      title,
      message,
      url: url || '/notifications',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error('Error in /api/notifications/dispatch-push:', err);
    return NextResponse.json(
      { error: 'Internal push dispatch error' },
      { status: 500 }
    );
  }
}
