import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return format(d, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return format(d, 'h:mm a');
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return format(d, 'MMM d, yyyy · h:mm a');
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isToday(d)) {
      return `Today at ${format(d, 'h:mm a')}`;
    }
    if (isTomorrow(d)) {
      return `Tomorrow at ${format(d, 'h:mm a')}`;
    }
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function formatDuration(minutes: number): string {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} mins`;
}

export function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return `${points}`;
}
