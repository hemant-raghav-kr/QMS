import { createClient } from '@/lib/supabase/client';
import { createNotification } from '@/features/notifications/services/notificationService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Meeting, MeetingStatus, MeetingType, Profile } from '@/types/database';

export interface CreateMeetingInput {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: MeetingType;
  external_meeting_url?: string;
  participant_ids?: string[];
}

export interface MeetingWithDetails extends Meeting {
  creator?: Profile | null;
  participants_count?: number;
}

export async function getMeetings(
  filter: 'upcoming' | 'past' | 'all' = 'upcoming',
  client?: SupabaseClient<Database>
): Promise<MeetingWithDetails[]> {
  const supabase = client || createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from('meetings')
    .select(`
      *,
      creator:profiles!meetings_created_by_fkey(*)
    `);

  if (filter === 'upcoming') {
    query = query.gte('scheduled_at', now).order('scheduled_at', { ascending: true });
  } else if (filter === 'past') {
    query = query.lt('scheduled_at', now).order('scheduled_at', { ascending: false });
  } else {
    query = query.order('scheduled_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching meetings: [${error.code || 'UNKNOWN'}] ${error.message || 'Unknown error'}${error.details ? ` (${error.details})` : ''}`);
    return [];
  }

  return (data as unknown as MeetingWithDetails[]) || [];
}

export async function getMeetingById(
  id: string,
  client?: SupabaseClient<Database>
): Promise<MeetingWithDetails | null> {
  const supabase = client || createClient();
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      creator:profiles!meetings_created_by_fkey(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching meeting: [${error.code || 'UNKNOWN'}] ${error.message || 'Unknown error'}${error.details ? ` (${error.details})` : ''}`);
    return null;
  }

  return data as unknown as MeetingWithDetails;
}

export async function getMeetingParticipants(
  meetingId: string,
  client?: SupabaseClient<Database>
): Promise<Profile[]> {
  const supabase = client || createClient();
  const { data, error } = await supabase
    .from('meeting_participants')
    .select(`
      profiles(*)
    `)
    .eq('meeting_id', meetingId);

  if (error) {
    console.error(`Error fetching participants: [${error.code || 'UNKNOWN'}] ${error.message || 'Unknown error'}${error.details ? ` (${error.details})` : ''}`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => row.profiles).filter(Boolean);
}

export async function createMeeting(input: CreateMeetingInput): Promise<{ data: Meeting | null; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'User must be authenticated to create a meeting.' };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      title: input.title,
      description: input.description || null,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes,
      meeting_type: input.meeting_type,
      external_meeting_url: input.meeting_type === 'EXTERNAL' ? input.external_meeting_url || null : null,
      status: 'SCHEDULED',
      created_by: user.id,
    })
    .select()
    .single();

  if (meetingError || !meeting) {
    return { data: null, error: meetingError?.message || 'Failed to create meeting.' };
  }

  // Insert participants if specified
  if (input.participant_ids && input.participant_ids.length > 0) {
    const participantsData = input.participant_ids.map((userId) => ({
      meeting_id: meeting.id,
      user_id: userId,
    }));

    await supabase.from('meeting_participants').insert(participantsData);

    // Notify participants
    for (const pid of input.participant_ids) {
      if (pid !== user.id) {
        createNotification({
          user_id: pid,
          title: `New Meeting: ${meeting.title}`,
          message: `You've been invited to attend "${meeting.title}".`,
          type: 'MEETING',
          link_url: `/meetings/${meeting.id}`,
        }).catch((e) => console.warn('Failed to notify participant:', e));
      }
    }
  }

  return { data: meeting };
}

export async function updateMeetingStatus(meetingId: string, status: MeetingStatus): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('meetings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', meetingId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteMeeting(meetingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateMeeting(
  meetingId: string,
  input: Partial<CreateMeetingInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('meetings')
    .update({
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.scheduled_at && { scheduled_at: input.scheduled_at }),
      ...(input.duration_minutes && { duration_minutes: input.duration_minutes }),
      ...(input.meeting_type && { meeting_type: input.meeting_type }),
      ...(input.external_meeting_url !== undefined && { external_meeting_url: input.external_meeting_url }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
