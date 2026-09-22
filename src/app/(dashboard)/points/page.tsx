'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { PointsSummaryCard } from '@/features/points/components/PointsSummaryCard';
import { TransactionTable } from '@/features/points/components/TransactionTable';
import {
  getUserPointsSummary,
  getUserTransactions,
  UserPointsSummary,
  PointTransactionWithDetails,
} from '@/features/points/services/pointService';
import {
  getAttendanceForUser,
  AttendanceWithDetails,
} from '@/features/attendance/services/attendanceService';
import { AttendanceTable } from '@/features/attendance/components/AttendanceTable';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Receipt, ArrowRight, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PointsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<UserPointsSummary>({
    totalPoints: 0,
    pointsEarned: 0,
    pointsDeducted: 0,
    transactionsCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = React.useState<PointTransactionWithDetails[]>([]);
  const [recentAttendance, setRecentAttendance] = React.useState<AttendanceWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadUserPoints() {
      if (!user) return;
      setIsLoading(true);
      try {
        const [sum, txs, att] = await Promise.all([
          getUserPointsSummary(user.id),
          getUserTransactions(user.id),
          getAttendanceForUser(user.id),
        ]);
        setSummary(sum);
        setRecentTransactions(txs.slice(0, 10));
        setRecentAttendance(att.slice(0, 5));
      } catch (err) {
        console.error('Error loading member points:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserPoints();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Points & Standing"
        description="Track your real-time earned points balance, attendance bonuses, and ledger entries"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/points/transactions">
              <Receipt className="h-4 w-4 mr-1.5" />
              Full Ledger History
            </Link>
          </Button>
        }
      />

      <PointsSummaryCard summary={summary} />

      {/* Grid: Recent Transactions and Recent Attendance */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Recent Points Transactions
            </h2>
            <Link
              href="/points/transactions"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1"
            >
              View all transactions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <TransactionTable transactions={recentTransactions} showUser={false} />
        </div>

        {recentAttendance.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-emerald-500" />
                <h2 className="text-lg font-bold text-foreground">
                  Recent Meeting Attendance
                </h2>
              </div>
              <Link
                href="/meetings?filter=past"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1"
              >
                View all past meetings <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <AttendanceTable records={recentAttendance} showUser={false} />
          </div>
        )}
      </div>
    </div>
  );
}
