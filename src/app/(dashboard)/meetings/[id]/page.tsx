import { createClient } from '@/lib/supabase/server';
import { getMeetingById, getMeetingParticipants } from '@/features/meetings/services/meetingService';
import { MeetingDetailView } from '@/features/meetings/components/MeetingDetailView';
import { notFound } from 'next/navigation';

interface MeetingDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MeetingDetailsPage({ params }: MeetingDetailsPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const meeting = await getMeetingById(resolvedParams.id, supabase);

  if (!meeting) {
    notFound();
  }

  const participants = await getMeetingParticipants(meeting.id, supabase);

  return (
    <MeetingDetailView
      meeting={meeting}
      participants={participants}
      attendanceRecords={[]}
    />
  );
}
