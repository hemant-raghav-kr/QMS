import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AccessToken } from 'livekit-server-sdk';
import { isAdmin } from '@/lib/auth/roles';
import { FEATURE_FLAGS } from '@/lib/config/features';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS) {
      return NextResponse.json(
        {
          error: 'Built-in video meetings are temporarily disabled. Please use the external meeting link.',
          disabled: true,
        },
        { status: 403 }
      );
    }

    const { id: meetingId } = await context.params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // 2. Fetch profile & meeting record
    const [{ data: profile }, { data: meeting, error: meetingError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('meetings').select('*').eq('id', meetingId).single(),
    ]);

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    }

    if (meeting.status === 'CANCELLED') {
      return NextResponse.json({ error: 'This meeting has been cancelled.' }, { status: 400 });
    }

    // 3. Authorization: User must be host, admin, or invited participant
    const isUserAdmin = isAdmin(profile?.role);
    const isHost = meeting.created_by === user.id || profile?.role === 'SUPER_ADMIN';

    if (!isUserAdmin && !isHost) {
      const { data: participant } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (!participant) {
        return NextResponse.json(
          { error: 'You are not an invited participant for this meeting.' },
          { status: 403 }
        );
      }
    }

    // 4. Update meeting status to LIVE if first participant joins and it was SCHEDULED
    if (meeting.status === 'SCHEDULED') {
      await supabase
        .from('meetings')
        .update({ status: 'LIVE', updated_at: new Date().toISOString() })
        .eq('id', meetingId);
    }

    // 5. Check LiveKit server configuration
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

    const isLiveKitConfigured = Boolean(
      apiKey &&
      apiSecret &&
      livekitUrl &&
      !apiKey.includes('your-livekit') &&
      !apiSecret.includes('your-livekit')
    );

    const userName = profile?.full_name || profile?.email?.split('@')[0] || user.email?.split('@')[0] || 'User';

    if (!isLiveKitConfigured) {
      return NextResponse.json({
        token: null,
        url: null,
        livekitConfigured: false,
        user: {
          id: user.id,
          name: userName,
          isHost,
          role: profile?.role || 'MEMBER',
        },
        message: 'LiveKit SFU credentials are not configured in .env.local yet.',
      });
    }

    // 6. Generate secure LiveKit access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: userName,
      metadata: JSON.stringify({
        userId: user.id,
        role: profile?.role || 'MEMBER',
        isHost,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: meetingId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
      livekitConfigured: true,
      user: {
        id: user.id,
        name: userName,
        isHost,
        role: profile?.role || 'MEMBER',
      },
    });
  } catch (err: unknown) {
    console.error('Error generating meeting token:', err);
    return NextResponse.json(
      { error: 'Failed to generate meeting access token' },
      { status: 500 }
    );
  }
}
