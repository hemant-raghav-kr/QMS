import { UserRole } from '@/types/database';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export function isSuperAdmin(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function isAdmin(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function isMember(role?: UserRole | null): boolean {
  return Boolean(role);
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function canManageMeetings(role?: UserRole | null): boolean {
  return isAdmin(role);
}

export function canManageAttendance(role?: UserRole | null): boolean {
  return isAdmin(role);
}

export function canManagePoints(role?: UserRole | null): boolean {
  return isAdmin(role);
}

export function canManageRules(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canViewAuditLogs(role?: UserRole | null): boolean {
  return isAdmin(role);
}
