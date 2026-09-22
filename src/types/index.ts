import { Tables } from './database';

export * from './database';
export * from './auth';

export interface MeetingWithHost extends Tables<'meetings'> {
  host?: Tables<'profiles'> | null;
  participants_count?: number;
  is_participant?: boolean;
}

export interface AttendanceRecordWithUser extends Tables<'attendance'> {
  user?: Tables<'profiles'> | null;
}

export interface PointTransactionWithDetails extends Tables<'point_transactions'> {
  user?: Tables<'profiles'> | null;
  rule?: Tables<'point_rules'> | null;
  meeting?: Tables<'meetings'> | null;
  issuer?: Tables<'profiles'> | null;
}
