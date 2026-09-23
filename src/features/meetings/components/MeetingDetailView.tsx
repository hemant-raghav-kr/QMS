'use client';

import * as React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime, formatDuration } from '@/lib/utils/formatters';
import {
  Calendar,
  Clock,
  ExternalLink,
  Video,
  Users,
  ArrowLeft,
  Shield,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import type { MeetingWithDetails } from '../services/meetingService';
import type { Profile, Attendance } from '@/types/database';
import {
  getMeetingParticipationSummary,
  ParticipantSessionSummary,
} from '../services/attendanceSessionService';
import { FEATURE_FLAGS } from '@/lib/config/features';

interface MeetingDetailViewProps {
  meeting: MeetingWithDetails;
  participants: Profile[];
  attendanceRecords?: Attendance[];
}

export function MeetingDetailView({
  meeting,
  participants,
  attendanceRecords = [],
}: MeetingDetailViewProps) {
  const isInternal = FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS && meeting.meeting_type === 'INTERNAL';
  const [copied, setCopied] = React.useState(false);
  const [participation, setParticipation] = React.useState<ParticipantSessionSummary[]>([]);
  const [isLoadingParticipation, setIsLoadingParticipation] = React.useState(true);

  const fetchParticipation = React.useCallback(async () => {
    setIsLoadingParticipation(true);
    try {
      const summary = await getMeetingParticipationSummary(meeting.id);
      setParticipation(summary);
    } catch (err) {
      console.error('Failed to load participation summary:', err);
    } finally {
      setIsLoadingParticipation(false);
    }
  }, [meeting.id]);

  React.useEffect(() => {
    fetchParticipation();
  }, [fetchParticipation]);

  const handleCopyLink = () => {
    const url = isInternal
      ? `${window.location.origin}/meetings/${meeting.id}/room`
      : meeting.external_meeting_url || window.location.href;

    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/meetings">
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>

      {/* Main meeting header banner */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={meeting.status} />
          <StatusBadge status={meeting.meeting_type} />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {meeting.title}
          </h1>
          {meeting.description && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-border text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span className="text-foreground">{formatDateTime(meeting.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{formatDuration(meeting.duration_minutes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{participants.length} invited participant{participants.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-3 flex flex-wrap items-center gap-3">
          {isInternal ? (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="gap-2 shadow-sm w-full sm:w-auto"
                asChild
              >
                <Link href={`/meetings/${meeting.id}/room`}>
                  <Video className="h-5 w-5" />
                  {meeting.status === 'COMPLETED' ? 'Enter Meeting Room (Ended)' : 'Join Quartzite Video Meeting'}
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="gap-2 w-full sm:w-auto border-border"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Room Link Copied!' : 'Copy Room Link'}
              </Button>

              <span className="text-xs text-muted-foreground">
                Quartzite Secure WebRTC SFU Conference
              </span>
            </div>
          ) : meeting.external_meeting_url ? (
            <div className="space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => window.open(meeting.external_meeting_url || '', '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-5 w-5" />
                  Join Meeting
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full sm:w-auto border-border"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">
                <span className="font-semibold text-foreground">Direct Link: </span>
                {meeting.external_meeting_url}
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No external meeting link was provided for this meeting.
            </p>
          )}
        </div>
      </div>

      {/* Grid: Participants and Attendance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participants roster */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between text-foreground">
              <span>Invited Participants</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                {participants.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                All organization members are permitted to join this meeting.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={participant.avatar_url}
                        fallback={participant.full_name || participant.email}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {participant.full_name || participant.email.split('@')[0]}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{participant.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded">
                      {participant.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Information */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>Attendance Sessions</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={fetchParticipation}
                title="Refresh attendance records"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingParticipation ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingParticipation ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-emerald-600 mb-2" />
                <p>Loading attendance data...</p>
              </div>
            ) : participation.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <span>Participant</span>
                  <span>Duration & Status</span>
                </div>
                {participation.map((summary) => (
                  <div
                    key={summary.userId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={summary.user?.avatar_url}
                        fallback={summary.user?.full_name || summary.user?.email || summary.userId}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {summary.user?.full_name || summary.user?.email?.split('@')[0] || `User ${summary.userId.slice(0, 6)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {summary.sessionCount} session{summary.sessionCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {summary.totalDurationMinutes} min ({summary.totalDurationSeconds}s)
                      </span>
                      {summary.attendanceStatus ? (
                        <StatusBadge status={summary.attendanceStatus} />
                      ) : (
                        <StatusBadge
                          status={
                            summary.totalDurationMinutes >= meeting.duration_minutes * 0.8
                              ? 'PRESENT'
                              : summary.totalDurationMinutes > 0
                              ? 'LEFT_EARLY'
                              : 'ABSENT'
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : attendanceRecords.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {attendanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-mono text-foreground">
                        {record.user_id.slice(0, 8)}...
                      </span>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                {meeting.status === 'LIVE' ? (
                  <>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Meeting is currently LIVE
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active attendee durations will appear here once sessions are recorded.
                    </p>
                  </>
                ) : meeting.status === 'COMPLETED' ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      No attendance logged
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No participants joined this session during its active period.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Scheduled Session
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Attendance starts recording automatically when participants connect to the room.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
