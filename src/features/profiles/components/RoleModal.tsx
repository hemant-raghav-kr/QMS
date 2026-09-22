'use client';

import * as React from 'react';
import { Profile, UserRole } from '@/types/database';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { updateUserRole } from '../services/profileService';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Profile;
  onRoleUpdated: (memberId: string, newRole: UserRole) => void;
}

export function RoleModal({ isOpen, onClose, member, onRoleUpdated }: RoleModalProps) {
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(member.role);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateUserRole(member.id, selectedRole);
    if (!result.success) {
      setError(result.error || 'Failed to update user role.');
      setIsSubmitting(false);
      return;
    }

    onRoleUpdated(member.id, selectedRole);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Modify User Role"
      description={`Update access privileges for ${member.full_name || member.email}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Action failed">
            {error}
          </Alert>
        )}

        <div className="space-y-1 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
          <p className="text-slate-500 text-xs">Target Account</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{member.email}</p>
          <p className="text-xs text-slate-400">Current Role: {member.role}</p>
        </div>

        <Select
          label="Assigned System Role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
        >
          <option value="MEMBER">MEMBER (Standard internal access)</option>
          <option value="ADMIN">ADMIN (Can manage meetings, attendance, points)</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN (Full system & role control)</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Role Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
