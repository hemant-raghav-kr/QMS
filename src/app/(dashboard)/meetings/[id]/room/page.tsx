import { createClient } from '@/lib/supabase/server';
import { getMeetingById } from '@/features/meetings/services/meetingService';
import { MeetingRoom } from '@/features/meetings/components/meeting-room/MeetingRoom';
import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import { FEATURE_FLAGS } from '@/lib/config/features';

interface MeetingRoomPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: 'Quartzite Meeting Room',
};

export default async function MeetingRoomPage({ params }: MeetingRoomPageProps) {
  const { id: meetingId } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/meetings/${meetingId}/room`);
  }

  // 2. Fetch profile & meeting
  const [{ data: profile }, meeting] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getMeetingById(meetingId, supabase),
  ]);

  if (!meeting) {
    notFound();
  }

  // Internal video rooms disabled or meeting is external
  if (!FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS || meeting.meeting_type === 'EXTERNAL') {
    redirect(`/meetings/${meetingId}`);
  }

  // 3. Verify access authorization
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
      redirect(`/meetings/${meetingId}?error=unauthorized`);
    }
  }

  const userName =
    profile?.full_name || profile?.email?.split('@')[0] || user.email?.split('@')[0] || 'User';

  return (
    <MeetingRoom
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      currentUser={{
        id: user.id,
        name: userName,
        isHost,
        role: profile?.role || 'MEMBER',
      }}
      userAvatarUrl={profile?.avatar_url}
    />
  );
}
