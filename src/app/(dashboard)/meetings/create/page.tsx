'use client';

import * as React from 'react';
import { CreateMeetingForm } from '@/features/meetings/components/CreateMeetingForm';
import { getProfiles } from '@/features/profiles/services/profileService';
import type { Profile } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateMeetingPage() {
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadMembers() {
      const data = await getProfiles();
      setMembers(data);
      setIsLoading(false);
    }
    loadMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <CreateMeetingForm availableMembers={members} />;
}
