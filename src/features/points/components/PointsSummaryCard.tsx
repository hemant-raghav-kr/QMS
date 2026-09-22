import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp, TrendingDown, History } from 'lucide-react';
import type { UserPointsSummary } from '../services/pointService';

interface PointsSummaryCardProps {
  summary: UserPointsSummary;
}

export function PointsSummaryCard({ summary }: PointsSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-md">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-emerald-100">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Current Balance
            </span>
            <Coins className="h-5 w-5 opacity-90" />
          </div>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {summary.totalPoints}
            </span>
            <span className="ml-2 text-sm font-medium text-emerald-100">pts</span>
          </div>
          <p className="mt-2 text-xs text-emerald-100/90">
            Derived automatically from your activity transactions
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Points Earned
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              +{summary.pointsEarned}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Attendance & recognized contributions
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Points Deducted
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              -{summary.pointsDeducted}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Lateness or missed mandatory sessions
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Activity Count
            </span>
            <div className="p-1.5 rounded-lg bg-secondary text-foreground">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              {summary.transactionsCount}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total ledger events recorded
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
