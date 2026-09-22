import { Badge } from '@/components/ui/badge';
import { MeetingStatus, AttendanceStatus, MeetingType } from '@/types/database';

interface StatusBadgeProps {
  status: MeetingStatus | AttendanceStatus | MeetingType | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    // Meeting Status
    case 'SCHEDULED':
      return <Badge variant="info">Scheduled</Badge>;
    case 'LIVE':
      return (
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      );
    case 'COMPLETED':
      return <Badge variant="secondary">Completed</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Cancelled</Badge>;

    // Attendance Status
    case 'PRESENT':
      return <Badge variant="success">Present</Badge>;
    case 'LATE':
      return <Badge variant="warning">Late</Badge>;
    case 'ABSENT':
      return <Badge variant="destructive">Absent</Badge>;
    case 'EXCUSED':
      return <Badge variant="secondary">Excused</Badge>;
    case 'LEFT_EARLY':
      return <Badge variant="warning">Left Early</Badge>;

    // Meeting Type
    case 'INTERNAL':
      return <Badge variant="success">Quartzite Video Meeting</Badge>;
    case 'EXTERNAL':
      return <Badge variant="secondary">External Meeting Link</Badge>;

    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
