'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/utils/formatters';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardCheck, ShieldAlert, Edit3 } from 'lucide-react';
import type { AttendanceWithDetails } from '../services/attendanceService';
import { AttendanceOverrideModal } from './AttendanceOverrideModal';

interface AttendanceTableProps {
  records: AttendanceWithDetails[];
  showUser?: boolean;
  canOverride?: boolean;
  onRecordUpdated?: () => void;
}

export function AttendanceTable({
  records,
  showUser = true,
  canOverride = false,
  onRecordUpdated,
}: AttendanceTableProps) {
  const [selectedRecordForOverride, setSelectedRecordForOverride] =
    React.useState<AttendanceWithDetails | null>(null);

  if (records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No Attendance Records"
        description="Attendance records will populate when members participate in scheduled meetings."
      />
    );
  }

  return (
    <>
      {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
      <div className="md:hidden space-y-3">
        {records.map((record) => {
          const scheduledMinutes = record.meeting?.duration_minutes || 60;
          const totalDurationMinutes = record.totalDurationMinutes ?? 0;
          const participationPct = record.participationPercentage ?? 0;

          return (
            <div
              key={`mob-att-${record.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-colors text-card-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {record.meeting?.title || 'General Session'}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Scheduled: {scheduledMinutes}m
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={record.status} />
                  {record.overridden_by && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      <ShieldAlert className="h-3 w-3" />
                      <span>Overridden</span>
                    </div>
                  )}
                </div>
              </div>

              {showUser && (
                <div className="flex items-center gap-2.5 pt-2 border-t border-border">
                  <Avatar
                    src={record.user?.avatar_url}
                    fallback={record.user?.full_name || record.user?.email || 'User'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {record.user?.full_name || record.user?.email?.split('@')[0] || 'Member'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{record.user?.email}</p>
                  </div>
                </div>
              )}

              {/* Progress & Duration */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-foreground">
                    {totalDurationMinutes} / {scheduledMinutes} min
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {participationPct}% attended
                  </span>
                </div>
                {totalDurationMinutes > 0 && (
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        participationPct >= 80
                          ? 'bg-emerald-500'
                          : participationPct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, participationPct)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Attendance Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Joined</span>
                  <span className="font-mono text-foreground">
                    {record.joined_at ? formatDateTime(record.joined_at) : 'Did not connect'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Sessions</span>
                  <span className="font-mono text-foreground">
                    {record.sessionsCount ? `${record.sessionsCount} session${record.sessionsCount === 1 ? '' : 's'}` : '0 sessions'}
                  </span>
                </div>
              </div>

              {canOverride && (
                <div className="pt-2 border-t border-border flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => setSelectedRecordForOverride(record)}
                  >
                    <Edit3 className="h-3 w-3" />
                    Override
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP RICH TABLE VIEW (Visible on md: 768px+) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
        <Table>
          <TableHeader>
            <TableRow>
              {showUser && <TableHead>Member</TableHead>}
              <TableHead>Meeting</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration / %</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Joined / Left</TableHead>
              {canOverride && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const scheduledMinutes = record.meeting?.duration_minutes || 60;
              const totalDurationMinutes = record.totalDurationMinutes ?? 0;
              const participationPct = record.participationPercentage ?? 0;

              return (
                <TableRow key={record.id} className="hover:bg-secondary/40 transition-colors">
                  {showUser && (
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={record.user?.avatar_url}
                          fallback={record.user?.full_name || record.user?.email || 'User'}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {record.user?.full_name || record.user?.email?.split('@')[0] || 'Member'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{record.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <p className="text-xs font-semibold text-foreground">
                      {record.meeting?.title || 'General Session'}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Scheduled: {scheduledMinutes}m
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <StatusBadge status={record.status} />
                      {record.overridden_by && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="h-3 w-3" />
                          <span title={record.override_reason || 'Administrative override'}>
                            Overridden
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-medium text-foreground">
                        {totalDurationMinutes} / {scheduledMinutes} min
                      </span>
                      {totalDurationMinutes > 0 && (
                        <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              participationPct >= 80
                                ? 'bg-emerald-500'
                                : participationPct >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, participationPct)}%` }}
                          />
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        {participationPct}% attended
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">
                      {record.sessionsCount ? `${record.sessionsCount} session${record.sessionsCount === 1 ? '' : 's'}` : '0 sessions'}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Joined: </span>
                      <span className="text-[11px] font-mono">
                        {record.joined_at ? formatDateTime(record.joined_at) : 'Did not connect'}
                      </span>
                    </div>
                    {record.left_at && (
                      <div>
                        <span className="text-[10px] text-muted-foreground">Left: </span>
                        <span className="text-[11px] font-mono">{formatDateTime(record.left_at)}</span>
                      </div>
                    )}
                  </TableCell>

                  {canOverride && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => setSelectedRecordForOverride(record)}
                        title="Override attendance status and recalculate points"
                      >
                        <Edit3 className="h-3 w-3" />
                        Override
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canOverride && (
        <AttendanceOverrideModal
          isOpen={!!selectedRecordForOverride}
          onClose={() => setSelectedRecordForOverride(null)}
          record={selectedRecordForOverride}
          onSuccess={() => {
            setSelectedRecordForOverride(null);
            onRecordUpdated?.();
          }}
        />
      )}
    </>
  );
}
