'use client';

import * as React from 'react';
import Link from 'next/link';
import { Profile, UserRole } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime, formatPoints } from '@/lib/utils/formatters';
import { canManageUsers, canManagePoints } from '@/lib/auth/roles';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import {
  Shield,
  Search,
  Coins,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  History,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RoleModal } from './RoleModal';
import { AwardPointsModal } from '@/features/points/components/AwardPointsModal';
import {
  getPointRules,
  getAllMemberBalances,
  getMemberRecentTransactions,
  type PointTransactionWithDetails,
} from '@/features/points/services/pointService';
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
  const [balances, setBalances] = React.useState<Record<string, number>>({});
  const [isLoadingBalances, setIsLoadingBalances] = React.useState(true);
  const [expandedMemberIds, setExpandedMemberIds] = React.useState<Set<string>>(new Set());
  const [memberTransactions, setMemberTransactions] = React.useState<Record<string, PointTransactionWithDetails[]>>({});
  const [loadingMemberTransactions, setLoadingMemberTransactions] = React.useState<Record<string, boolean>>({});

  const { user } = useAuth();
  const isSuperAdmin = canManageUsers(user?.role);
  const canAdjustPoints = canManagePoints(user?.role);

  const loadBalances = React.useCallback(async () => {
    try {
      const b = await getAllMemberBalances();
      setBalances(b);
    } catch (err) {
      console.error('Failed to load member balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  React.useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  React.useEffect(() => {
    if (canAdjustPoints) {
      getPointRules().then(setRules).catch(() => {});
    }
  }, [canAdjustPoints]);

  const toggleExpand = async (memberId: string) => {
    const isExpanded = expandedMemberIds.has(memberId);
    const next = new Set(expandedMemberIds);
    if (isExpanded) {
      next.delete(memberId);
      setExpandedMemberIds(next);
    } else {
      next.add(memberId);
      setExpandedMemberIds(next);
      // Lazy-load recent transactions on demand if not already loaded
      if (!memberTransactions[memberId]) {
        setLoadingMemberTransactions((prev) => ({ ...prev, [memberId]: true }));
        try {
          const txs = await getMemberRecentTransactions(memberId, 5);
          setMemberTransactions((prev) => ({ ...prev, [memberId]: txs }));
        } catch (err) {
          console.error(`Failed to load transactions for ${memberId}:`, err);
        } finally {
          setLoadingMemberTransactions((prev) => ({ ...prev, [memberId]: false }));
        }
      }
    }
  };

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

  const renderBalance = (balance: number | undefined) => {
    if (isLoadingBalances && balance === undefined) {
      return <span className="text-muted-foreground animate-pulse text-xs">...</span>;
    }
    const val = balance ?? 0;
    const isPositive = val > 0;
    const isNegative = val < 0;

    return (
      <span
        className={`font-mono font-bold text-xs sm:text-sm ${
          isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : isNegative
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-muted-foreground'
        }`}
      >
        {val > 0 ? `+${val}` : val} pts
      </span>
    );
  };

  const renderExpandedHistory = (member: Profile) => {
    const txs = memberTransactions[member.id];
    const isLoadingTxs = loadingMemberTransactions[member.id];

    return (
      <div className="bg-muted/30 border-t border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Recent Point History ({txs ? `${txs.length} recent` : '...'})
            </span>
          </div>
          <Link
            href={`/points/transactions?search=${encodeURIComponent(member.email)}`}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            View full history →
          </Link>
        </div>

        {isLoadingTxs ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            <span>Loading transaction history...</span>
          </div>
        ) : !txs || txs.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card/50">
            <History className="h-5 w-5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">No point history</span>
            <span className="text-[11px] text-muted-foreground">No transactions recorded for this member yet.</span>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card overflow-hidden">
            {txs.map((tx) => {
              const isPos = tx.amount > 0;
              const isNeg = tx.amount < 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 text-xs hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono font-bold flex items-center gap-0.5 text-xs ${
                          isPos
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isNeg
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {isPos ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : isNeg ? (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        ) : null}
                        {formatPoints(tx.amount)} pts
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground border border-border/50">
                        {tx.type}
                      </span>
                      {tx.reversal_of_id && (
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-mono text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Reverses #{tx.reversal_of_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground truncate mt-1">
                      {tx.reason || 'Ledger event'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDateTime(tx.created_at)}
                      {tx.creator && (
                        <span> • by {tx.creator.full_name || tx.creator.email}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

                {/* Point Balance & Dropdown Toggle */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 border border-border/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-emerald-500" />
                    <span className="text-muted-foreground font-medium">Points:</span>
                    {renderBalance(balances[member.id])}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(member.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <span>{expandedMemberIds.has(member.id) ? 'Hide History' : 'Recent History'}</span>
                    {expandedMemberIds.has(member.id) ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Expanded Recent History */}
                {expandedMemberIds.has(member.id) && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    {renderExpandedHistory(member)}
                  </div>
                )}

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
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Point Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  {(isSuperAdmin || canAdjustPoints) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <React.Fragment key={member.id}>
                    <TableRow
                      className={`hover:bg-secondary/40 transition-colors ${
                        expandedMemberIds.has(member.id) ? 'bg-secondary/20' : ''
                      }`}
                    >
                      <TableCell className="w-10 pr-0">
                        <button
                          type="button"
                          onClick={() => toggleExpand(member.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          title={expandedMemberIds.has(member.id) ? 'Collapse history' : 'Expand history'}
                          aria-label={expandedMemberIds.has(member.id) ? 'Collapse history' : 'Expand history'}
                        >
                          {expandedMemberIds.has(member.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Coins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          {renderBalance(balances[member.id])}
                        </div>
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

                    {/* Expandable Recent Transaction History Row */}
                    {expandedMemberIds.has(member.id) && (
                      <TableRow className="hover:bg-transparent bg-muted/10 border-b border-border">
                        <TableCell colSpan={isSuperAdmin || canAdjustPoints ? 7 : 6} className="p-0">
                          {renderExpandedHistory(member)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
            const targetId = adjustPointsMember.id;
            setAdjustPointsMember(null);
            // Refresh member balances
            loadBalances();
            // If this member's recent transactions were cached, refetch them
            getMemberRecentTransactions(targetId, 5)
              .then((txs) => {
                setMemberTransactions((prev) => ({ ...prev, [targetId]: txs }));
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
