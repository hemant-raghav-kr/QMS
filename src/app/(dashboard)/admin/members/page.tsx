'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MemberList } from '@/features/profiles/components/MemberList';
import { getProfiles } from '@/features/profiles/services/profileService';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile } from '@/types/database';

export default function AdminMembersPage() {
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadMembers() {
      setIsLoading(true);
      const data = await getProfiles();
      setMembers(data);
      setIsLoading(false);
    }
    loadMembers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Members"
        description="Manage user profiles, view registered accounts, and assign system permissions"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <MemberList initialMembers={members} />
      )}
    </div>
  );
}
