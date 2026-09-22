import { UserRole } from '@/types/database';
import { isAdmin, isSuperAdmin } from '../auth/roles';

export type Permission =
  | 'meetings.create'
  | 'meetings.update'
  | 'meetings.delete'
  | 'attendance.mark'
  | 'attendance.view_all'
  | 'points.award'
  | 'points.deduct'
  | 'rules.manage'
  | 'announcements.create'
  | 'members.view'
  | 'members.change_role'
  | 'audit.view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'meetings.create',
    'meetings.update',
    'meetings.delete',
    'attendance.mark',
    'attendance.view_all',
    'points.award',
    'points.deduct',
    'rules.manage',
    'announcements.create',
    'members.view',
    'members.change_role',
    'audit.view',
  ],
  ADMIN: [
    'meetings.create',
    'meetings.update',
    'meetings.delete',
    'attendance.mark',
    'attendance.view_all',
    'points.award',
    'points.deduct',
    'announcements.create',
    'members.view',
    'audit.view',
  ],
  MEMBER: [],
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export { isAdmin, isSuperAdmin };
