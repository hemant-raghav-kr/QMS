'use client';

import * as React from 'react';
import { Profile, UserRole } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/formatters';
import { canManageUsers, canManagePoints } from '@/lib/auth/roles';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Shield, Search, Coins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RoleModal } from './RoleModal';
import { AwardPointsModal } from '@/features/points/components/AwardPointsModal';
import { getPointRules } from '@/features/points/services/pointService';
import type { PointRule } from '@/types/database';

interface MemberListProps {
  initialMembers: Profile[];
}

export function MemberList({ initialMembers }: MemberListProps) {
  const [members, setMembers] = React.useState<Profile[]>(initialMembers);
  const [search, setSearch] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<Profile | null>(null);
  const [adjustPointsMember, setAdjustPointsMember] = React.useState<Profile | null>(null);
  const [rules, setRules] = React.useState<PointRule[]>([]);
  const { user } = useAuth();
  const isSuperAdmin = canManageUsers(user?.role);
  const canAdjustPoints = canManagePoints(user?.role);

  React.useEffect(() => {
    if (canAdjustPoints) {
      getPointRules().then(setRules).catch(() => {});
    }
  }, [canAdjustPoints]);

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.email.toLowerCase().includes(q) ||
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const handleRoleUpdated = (memberId: string, newRole: UserRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} registered accounts
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No members found matching &quot;{search}&quot;.
        </div>
      ) : (
        <>
          {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={`mob-mem-${member.id}`}
                className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-colors text-card-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={member.avatar_url}
                      fallback={member.full_name || member.email}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {member.full_name || 'Member'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{member.email}</p>
                    </div>
                  </div>
                  <RoleBadge role={member.role} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    Joined {formatDate(member.created_at)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canAdjustPoints && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjustPointsMember(member)}
                        className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      >
                        <Coins className="h-3 w-3 text-emerald-500" />
                        Points
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMember(member)}
                        className="h-7 text-xs gap-1 border-border hover:border-emerald-500/50"
                      >
                        <Shield className="h-3 w-3 text-amber-500" />
                        Role
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. DESKTOP RICH TABLE VIEW (Visible on md: 768px+) */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {(isSuperAdmin || canAdjustPoints) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-secondary/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={member.avatar_url}
                          fallback={member.full_name || member.email}
                          size="sm"
                        />
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {member.full_name || '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(member.created_at)}
                    </TableCell>
                    {(isSuperAdmin || canAdjustPoints) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canAdjustPoints && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAdjustPointsMember(member)}
                              className="gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            >
                              <Coins className="h-3.5 w-3.5 text-emerald-500" />
                              Adjust Points
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMember(member)}
                              className="gap-1.5"
                            >
                              <Shield className="h-3.5 w-3.5 text-amber-500" />
                              Edit Role
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {selectedMember && (
        <RoleModal
          isOpen={Boolean(selectedMember)}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
          onRoleUpdated={handleRoleUpdated}
        />
      )}

      {adjustPointsMember && (
        <AwardPointsModal
          isOpen={Boolean(adjustPointsMember)}
          onClose={() => setAdjustPointsMember(null)}
          members={members}
          rules={rules}
          initialUserId={adjustPointsMember.id}
          onSuccess={() => {
            setAdjustPointsMember(null);
          }}
        />
      )}
    </div>
  );
}
