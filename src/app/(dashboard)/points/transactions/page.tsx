'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TransactionTable } from '@/features/points/components/TransactionTable';
import { AwardPointsModal } from '@/features/points/components/AwardPointsModal';
import {
  getUserTransactions,
  getAllTransactions,
  getPointRules,
  PointTransactionWithDetails,
} from '@/features/points/services/pointService';
import { getProfiles } from '@/features/profiles/services/profileService';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { canManagePoints } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Filter, Search, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile, PointRule } from '@/types/database';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isAdminUser = canManagePoints(user?.role);

  const [transactions, setTransactions] = React.useState<PointTransactionWithDetails[]>([]);
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [rules, setRules] = React.useState<PointRule[]>([]);
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (isAdminUser) {
        const [txData, memberData, rulesData] = await Promise.all([
          getAllTransactions(),
          getProfiles(),
          getPointRules(),
        ]);
        setTransactions(txData);
        setMembers(memberData);
        setRules(rulesData);
      } else {
        const txData = await getUserTransactions(user.id);
        setTransactions(txData);
      }
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdminUser]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side filtering
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = selectedType === 'all' || tx.type === selectedType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.reason.toLowerCase().includes(q) ||
        (tx.user?.full_name?.toLowerCase().includes(q) ?? false) ||
        (tx.user?.email?.toLowerCase().includes(q) ?? false) ||
        (tx.meeting?.title?.toLowerCase().includes(q) ?? false) ||
        (tx.rule?.name?.toLowerCase().includes(q) ?? false);

      return matchesType && matchesSearch;
    });
  }, [transactions, selectedType, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point Transactions Ledger"
        description={
          isAdminUser
            ? 'Complete immutable audit ledger of all automatic meeting points, manual adjustments, and reversals'
            : 'Historical immutable transaction ledger for your account'
        }
        action={
          isAdminUser ? (
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Award / Deduct Points
            </Button>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative">
          <Input
            placeholder="Search by reason, member, or meeting title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-card"
          />
        </div>

        <Select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border-border bg-card"
        >
          <option value="all">All Transaction Classifications ({transactions.length})</option>
          <option value="AUTOMATIC">Automatic Meeting Attendance</option>
          <option value="MANUAL">Manual Administrative Entries</option>
          <option value="ADJUSTMENT">Attendance Overrides & Adjustments</option>
          <option value="REVERSAL">Audit Reversals</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <TransactionTable
          transactions={filteredTransactions}
          showUser={isAdminUser}
          canReverse={isAdminUser}
          onTransactionUpdated={loadData}
        />
      )}

      {isAdminUser && (
        <AwardPointsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          members={members}
          rules={rules}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
