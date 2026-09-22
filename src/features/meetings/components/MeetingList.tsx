'use client';

import * as React from 'react';
import Link from 'next/link';
import { MeetingCard } from './MeetingCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { canManageMeetings } from '@/lib/auth/roles';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import type { MeetingWithDetails } from '../services/meetingService';

interface MeetingListProps {
  meetings: MeetingWithDetails[];
  filterType: 'upcoming' | 'past';
}

export function MeetingList({ meetings, filterType }: MeetingListProps) {
  const { user } = useAuth();
  const isAdminUser = canManageMeetings(user?.role);

  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={filterType === 'upcoming' ? 'No Upcoming Meetings' : 'No Past Meetings'}
        description={
          filterType === 'upcoming'
            ? 'There are currently no sessions scheduled. Check back later or schedule a new team meeting.'
            : 'No concluded meetings were found in the archive.'
        }
        action={
          isAdminUser && filterType === 'upcoming' ? (
            <Button variant="primary" size="sm" asChild>
              <Link href="/meetings/create">
                <Plus className="h-4 w-4 mr-1.5" />
                Schedule Meeting
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}
