'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { MeetingList } from '@/features/meetings/components/MeetingList';
import { getMeetings, MeetingWithDetails } from '@/features/meetings/services/meetingService';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { canManageMeetings } from '@/lib/auth/roles';
import { Skeleton } from '@/components/ui/skeleton';

function MeetingsContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter') === 'past' ? 'past' : 'upcoming';
  const [activeTab, setActiveTab] = React.useState<'upcoming' | 'past'>(filterParam);
  const [meetings, setMeetings] = React.useState<MeetingWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const isAdminUser = canManageMeetings(user?.role);

  React.useEffect(() => {
    setActiveTab(filterParam);
  }, [filterParam]);

  React.useEffect(() => {
    async function loadMeetings() {
      setIsLoading(true);
      const data = await getMeetings(activeTab);
      setMeetings(data);
      setIsLoading(false);
    }
    loadMeetings();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description="Schedule, join, and review organization sessions"
        action={
          isAdminUser ? (
            <Button variant="primary" size="sm" asChild>
              <Link href="/meetings/create">
                <Plus className="h-4 w-4 mr-1.5" />
                Schedule Meeting
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        <Link
          href="/meetings"
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'upcoming'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming Meetings
        </Link>
        <Link
          href="/meetings?filter=past"
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'past'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Past Meetings
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <MeetingList meetings={meetings} filterType={activeTab} />
      )}
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <React.Suspense fallback={<div className="text-slate-500 text-sm">Loading meetings...</div>}>
      <MeetingsContent />
    </React.Suspense>
  );
}
