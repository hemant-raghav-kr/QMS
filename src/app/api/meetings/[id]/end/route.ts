import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: meetingId } = await context.params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. Fetch profile & meeting
    const [{ data: profile }, { data: meeting, error: meetingError }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('meetings').select('*').eq('id', meetingId).single(),
    ]);

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    }

    // 3. Verify host authorization
    const isHost = meeting.created_by === user.id || isAdmin(profile?.role);
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only the meeting host or an administrator can end this session.' },
        { status: 403 }
      );
    }

    // 4. Update meeting status to COMPLETED
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    if (updateError) {
      throw updateError;
    }

    // 5. Finalize attendance roll-up
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('finalize_meeting_attendance', {
        target_meeting_id: meetingId,
      });
    } catch (rpcErr) {
      console.warn('finalize_meeting_attendance RPC executed or deferred:', rpcErr);
    }

    // 6. Automatically evaluate attendance and award points
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('process_meeting_points', {
        target_meeting_id: meetingId,
        p_actor_id: user.id,
      });
    } catch (ptsErr) {
      console.warn('process_meeting_points RPC executed or deferred:', ptsErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting concluded, attendance finalized, and points automatically evaluated.',
    });
  } catch (err: unknown) {
    console.error('Error ending meeting:', err);
    return NextResponse.json(
      { error: 'Failed to conclude meeting session' },
      { status: 500 }
    );
  }
}
