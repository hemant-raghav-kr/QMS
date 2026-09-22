import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { savePushSubscription, removePushSubscription } from '@/features/notifications/services/pushService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription payload. Endpoint and keys required.' },
        { status: 400 }
      );
    }

    const result = await savePushSubscription(user.id, {
      endpoint,
      keys,
      userAgent: userAgent || request.headers.get('user-agent') || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Push subscription registered.' });
  } catch (err: unknown) {
    console.error('Error in /api/notifications/push POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Subscription error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required.' }, { status: 400 });
    }

    await removePushSubscription(endpoint);
    return NextResponse.json({ success: true, message: 'Push subscription removed.' });
  } catch (err: unknown) {
    console.error('Error in /api/notifications/push DELETE:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unsubscribe error' },
      { status: 500 }
    );
  }
}


