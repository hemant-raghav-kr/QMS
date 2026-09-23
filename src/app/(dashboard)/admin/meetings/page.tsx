'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import {
  Video,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Plus,
  Play,
  CalendarCheck,
} from 'lucide-react';
import {
  getMeetings,
  updateMeetingStatus,
  deleteMeeting,
  MeetingWithDetails,
} from '@/features/meetings/services/meetingService';
import type { MeetingStatus } from '@/types/database';

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = React.useState<MeetingWithDetails[]>([]);
  const [filter, setFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const loadMeetings = React.useCallback(async () => {
    setIsLoading(true);
    const data = await getMeetings('all');
    setMeetings(data);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleStatusChange = async (meetingId: string, newStatus: MeetingStatus) => {
    setActionInProgress(meetingId);
    const res = await updateMeetingStatus(meetingId, newStatus);
    if (res.success) {
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, status: newStatus } : m))
      );
    }
    setActionInProgress(null);
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting? All associated attendance records will be removed.')) {
      return;
    }
    setActionInProgress(meetingId);
    const res = await deleteMeeting(meetingId);
    if (res.success) {
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    }
    setActionInProgress(null);
  };

  const filteredMeetings = meetings.filter((m) => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  const scheduledCount = meetings.filter((m) => m.status === 'SCHEDULED').length;
  const inProgressCount = meetings.filter((m) => m.status === 'LIVE').length;
  const completedCount = meetings.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Meetings Management"
          description="Schedule, inspect sessions, override statuses, and audit meeting participation"
        />
        <Link href="/meetings/create">
          <Button variant="primary" size="sm" className="gap-1.5 self-start sm:self-auto text-xs">
            <Plus className="h-4 w-4" />
            Schedule New Meeting
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Total Meetings</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {meetings.length}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Live / In-Progress</p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {inProgressCount}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Upcoming Scheduled</p>
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {scheduledCount}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Completed</p>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {completedCount}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800 overflow-x-auto">
        {['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              filter === tab
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Meetings Table */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Meetings Found"
          description="There are currently no meetings matching this status."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Meeting Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scheduled Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Host / Creator</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMeetings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {m.title}
                      </div>
                      {m.description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {m.meeting_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      <div>{formatDate(m.scheduled_at)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(m.scheduled_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {m.duration_minutes} min
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {m.creator?.full_name || m.creator?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          m.status === 'LIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 animate-pulse'
                            : m.status === 'SCHEDULED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                            : m.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/meetings/${m.id}`}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/admin/attendance?meetingId=${m.id}`}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors"
                          title="Inspect Attendance"
                        >
                          <CalendarCheck className="h-4 w-4" />
                        </Link>

                        {m.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleStatusChange(m.id, 'COMPLETED')}
                            disabled={actionInProgress === m.id}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={actionInProgress === m.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                          title="Delete Meeting"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
