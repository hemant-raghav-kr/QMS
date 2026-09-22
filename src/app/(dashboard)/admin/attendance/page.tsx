'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AttendanceTable } from '@/features/attendance/components/AttendanceTable';
import {
  getAllAttendanceWithMetrics,
  AttendanceWithDetails,
} from '@/features/attendance/services/attendanceService';
import { getMeetings } from '@/features/meetings/services/meetingService';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle2, Clock, XCircle, ShieldCheck, Search, Filter } from 'lucide-react';
import type { Meeting } from '@/types/database';

export default function AdminAttendancePage() {
  const [records, setRecords] = React.useState<AttendanceWithDetails[]>([]);
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);

  const loadAttendance = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [attData, meetData] = await Promise.all([
        getAllAttendanceWithMetrics(selectedMeetingId === 'all' ? undefined : selectedMeetingId),
        getMeetings('all'),
      ]);
      setRecords(attData);
      setMeetings(meetData);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMeetingId]);

  React.useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Client-side filtering for status and search query
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.user?.full_name?.toLowerCase().includes(q) ?? false) ||
        (r.user?.email?.toLowerCase().includes(q) ?? false) ||
        (r.meeting?.title?.toLowerCase().includes(q) ?? false);

      return matchesStatus && matchesSearch;
    });
  }, [records, selectedStatus, searchQuery]);

  // Metric counts
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        description="Comprehensive organization-wide attendance tracking, participation metrics, and administrative overrides"
      />

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Present</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? '—' : presentCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Late</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? '—' : lateCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Absent</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? '—' : absentCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Excused</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? '—' : excusedCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative">
          <Input
            placeholder="Search by member or meeting title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-card"
          />
        </div>

        <Select
          value={selectedMeetingId}
          onChange={(e) => setSelectedMeetingId(e.target.value)}
          className="border-border bg-card"
        >
          <option value="all">All Scheduled Meetings ({meetings.length})</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </Select>

        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border-border bg-card"
        >
          <option value="all">All Statuses</option>
          <option value="PRESENT">Present Only</option>
          <option value="LATE">Late Only</option>
          <option value="LEFT_EARLY">Left Early Only</option>
          <option value="ABSENT">Absent Only</option>
          <option value="EXCUSED">Excused Only</option>
        </Select>
      </div>

      {/* Records Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <AttendanceTable
          records={filteredRecords}
          showUser={true}
          canOverride={true}
          onRecordUpdated={loadAttendance}
        />
      )}
    </div>
  );
}
