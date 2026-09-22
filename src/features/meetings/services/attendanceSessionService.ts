import { createClient } from '@/lib/supabase/client';
import type { Profile, MeetingAttendanceSession } from '@/types/database';

export interface ParticipantSessionSummary {
  userId: string;
  user: Profile | null;
  totalDurationMinutes: number;
  totalDurationSeconds: number;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  sessionCount: number;
  attendanceStatus?: string;
}

export async function startAttendanceSession(
  meetingId: string,
  userId: string,
  sessionId: string
): Promise<{ success: boolean; id?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('meeting_attendance_sessions')
      .insert({
        meeting_id: meetingId,
        user_id: userId,
        session_id: sessionId,
        joined_at: new Date().toISOString(),
        duration_seconds: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Could not record attendance session start:', error.message);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.warn('Error starting attendance session:', err);
    return { success: false };
  }
}

export async function endAttendanceSession(sessionId: string): Promise<void> {
  try {
    const supabase = createClient();
    const now = new Date();

    // Fetch existing session to compute duration
    const { data: session } = await supabase
      .from('meeting_attendance_sessions')
      .select('joined_at')
      .eq('session_id', sessionId)
      .single();

    if (session && session.joined_at) {
      const joinTime = new Date(session.joined_at);
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - joinTime.getTime()) / 1000));

      await supabase
        .from('meeting_attendance_sessions')
        .update({
          left_at: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('session_id', sessionId);
    }
  } catch (err) {
    console.warn('Error ending attendance session:', err);
  }
}

export async function getMeetingAttendanceSessions(
  meetingId: string
): Promise<MeetingAttendanceSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('meeting_attendance_sessions')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching attendance sessions:', error);
    return [];
  }

  return data || [];
}

export async function getMeetingParticipationSummary(
  meetingId: string
): Promise<ParticipantSessionSummary[]> {
  const supabase = createClient();

  const [{ data: sessions }, { data: attendanceRecords }] = await Promise.all([
    supabase
      .from('meeting_attendance_sessions')
      .select(`
        *,
        user:profiles!meeting_attendance_sessions_user_id_fkey(*)
      `)
      .eq('meeting_id', meetingId),
    supabase
      .from('attendance')
      .select('*')
      .eq('meeting_id', meetingId),
  ]);

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const map = new Map<string, ParticipantSessionSummary>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessions.forEach((sess: any) => {
    const uId = sess.user_id;
    const existing = map.get(uId);

    const dur = sess.duration_seconds || 0;
    const joined = sess.joined_at;
    const left = sess.left_at || sess.joined_at;

    if (!existing) {
      map.set(uId, {
        userId: uId,
        user: sess.user || null,
        totalDurationSeconds: dur,
        totalDurationMinutes: Math.round(dur / 60),
        firstJoinedAt: joined,
        lastLeftAt: left,
        sessionCount: 1,
      });
    } else {
      existing.totalDurationSeconds += dur;
      existing.totalDurationMinutes = Math.round(existing.totalDurationSeconds / 60);
      existing.sessionCount += 1;
      if (joined && (!existing.firstJoinedAt || joined < existing.firstJoinedAt)) {
        existing.firstJoinedAt = joined;
      }
      if (left && (!existing.lastLeftAt || left > existing.lastLeftAt)) {
        existing.lastLeftAt = left;
      }
    }
  });

  // Attach final calculated attendance status if present
  if (attendanceRecords) {
    attendanceRecords.forEach((att) => {
      const item = map.get(att.user_id);
      if (item) {
        item.attendanceStatus = att.status;
      }
    });
  }

  return Array.from(map.values());
}
