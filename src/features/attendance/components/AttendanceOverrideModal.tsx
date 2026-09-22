'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { overrideAttendance, AttendanceWithDetails } from '../services/attendanceService';
import { AttendanceStatus } from '@/types/database';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface AttendanceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceWithDetails | null;
  onSuccess: () => void;
}

const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string; description: string }[] = [
  { value: 'PRESENT', label: 'Present (>= 80% duration)', description: 'Full meeting participation (+5 pts default)' },
  { value: 'LEFT_EARLY', label: 'Left Early', description: 'Departed before minimum duration (+1 pt default)' },
  { value: 'EXCUSED', label: 'Excused', description: 'Authorized absence or approved leave (0 pts default)' },
  { value: 'ABSENT', label: 'Absent', description: 'Unexcused meeting absence (-5 pts default)' },
];

export function AttendanceOverrideModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: AttendanceOverrideModalProps) {
  const [newStatus, setNewStatus] = React.useState<AttendanceStatus>('EXCUSED');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (record) {
      // Default to EXCUSED if ABSENT, or PRESENT if EXCUSED
      setNewStatus(record.status === 'ABSENT' ? 'EXCUSED' : 'PRESENT');
      setReason('');
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newStatus === record.status) {
      setError('The selected status is identical to the current status.');
      return;
    }

    if (!reason.trim()) {
      setError('A mandatory reason is required to override attendance and adjust member points.');
      return;
    }

    setIsLoading(true);

    const res = await overrideAttendance({
      meetingId: record.meeting_id,
      userId: record.user_id,
      newStatus,
      reason: reason.trim(),
    });

    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to override attendance.');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Override Attendance Status"
      description="Update participant attendance and automatically recalculate points"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Participant Context Card */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 font-medium">Participant:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {record.user?.full_name || record.user?.email || 'Member'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 block">Meeting:</span>
              <span className="font-medium text-slate-900 dark:text-white line-clamp-1">
                {record.meeting?.title || 'General Session'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Current Status:</span>
              <div className="pt-0.5">
                <StatusBadge status={record.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Automatic Point Recalculation Notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          <ShieldAlert className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Automated Point Recalculation</p>
            <p>
              When this override is submitted, the system will atomically reverse any prior points awarded or
              deducted for this meeting and apply points for <strong className="uppercase">{newStatus}</strong>{' '}
              according to your active Point Rules.
            </p>
          </div>
        </div>

        {/* New Status Selection */}
        <Select
          label="New Attendance Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
          required
        >
          {ATTENDANCE_STATUSES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label} ({st.description})
            </option>
          ))}
        </Select>

        {/* Override Reason */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Override Reason (Required)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Document why this attendance is being corrected (e.g. Approved medical leave, Joined via external dial-in, Technical SFU disconnection)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" className="gap-1.5" disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Saving Override...' : 'Confirm Override & Update Points'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
