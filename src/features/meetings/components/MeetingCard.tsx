'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDuration } from '@/lib/utils/formatters';
import { format } from 'date-fns';
import { Calendar, Clock, ExternalLink, Video, ArrowRight } from 'lucide-react';
import type { MeetingWithDetails } from '../services/meetingService';

interface MeetingCardProps {
  meeting: MeetingWithDetails;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const meetingDate = new Date(meeting.scheduled_at);
  const formattedTime = format(meetingDate, 'h:mm a');
  const isInternal = meeting.meeting_type === 'INTERNAL';

  return (
    <Card className="group border-border bg-card hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={meeting.status} />
              <StatusBadge status={meeting.meeting_type} />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link>
            </h3>

            {meeting.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {meeting.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                {formatDate(meeting.scheduled_at)}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formattedTime} ({formatDuration(meeting.duration_minutes)})
              </span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
            {isInternal ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                asChild
              >
                <Link href={`/meetings/${meeting.id}/room`}>
                  <Video className="h-4 w-4" />
                  Join Meeting
                </Link>
              </Button>
            ) : meeting.external_meeting_url ? (
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                onClick={() => window.open(meeting.external_meeting_url || '', '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                External Link
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                asChild
              >
                <Link href={`/meetings/${meeting.id}`}>
                  View Details
                </Link>
              </Button>
            )}

            <Link
              href={`/meetings/${meeting.id}`}
              className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium sm:pt-2"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
