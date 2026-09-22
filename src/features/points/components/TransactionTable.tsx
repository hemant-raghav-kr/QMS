'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatPoints } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/shared/EmptyState';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Coins, ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import type { PointTransactionWithDetails } from '../services/pointService';
import { ReverseTransactionModal } from './ReverseTransactionModal';

interface TransactionTableProps {
  transactions: PointTransactionWithDetails[];
  showUser?: boolean;
  canReverse?: boolean;
  onTransactionUpdated?: () => void;
}

export function TransactionTable({
  transactions,
  showUser = false,
  canReverse = false,
  onTransactionUpdated,
}: TransactionTableProps) {
  const [selectedTxForReversal, setSelectedTxForReversal] = React.useState<PointTransactionWithDetails | null>(null);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Coins}
        title="No Transactions Recorded"
        description="Point transactions will appear here when attendance rules, meetings, or awards are triggered."
      />
    );
  }

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'AUTOMATIC':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Automatic
          </span>
        );
      case 'MANUAL':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Manual
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Adjustment
          </span>
        );
      case 'REVERSAL':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Reversal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {type}
          </span>
        );
    }
  };

  // Set of transaction IDs that have already been reversed
  const reversedTxIds = new Set(
    transactions.filter((tx) => tx.reversal_of_id).map((tx) => tx.reversal_of_id)
  );

  return (
    <>
      {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx) => {
          const isPositive = tx.amount > 0;
          const isAlreadyReversed = reversedTxIds.has(tx.id);
          const isReversal = tx.type === 'REVERSAL';

          return (
            <div
              key={`mob-${tx.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-colors text-card-foreground"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono font-black text-base ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tx.amount === 0
                        ? 'text-muted-foreground'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : tx.amount === 0 ? (
                      <span>±</span>
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {formatPoints(tx.amount)} pts
                  </span>
                  {renderTypeBadge(tx.type || 'MANUAL')}
                </div>

                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(tx.created_at)}
                </span>
              </div>

              {showUser && tx.user && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Avatar
                    src={tx.user.avatar_url}
                    fallback={tx.user.full_name || tx.user.email || 'User'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {tx.user.full_name || tx.user.email?.split('@')[0] || 'Member'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{tx.user.email}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {tx.reason || 'Ledger event'}
                </p>
                {tx.meeting && (
                  <p className="text-[11px] text-muted-foreground">
                    Meeting: <span className="font-semibold">{tx.meeting.title}</span>
                  </p>
                )}
                {tx.reversal_of_id && (
                  <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                    Reverses transaction #{tx.reversal_of_id.slice(0, 8)}
                  </p>
                )}
                {isAlreadyReversed && (
                  <span className="inline-block rounded bg-secondary px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground">
                    (Reversed in ledger)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                <span className="inline-flex rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {tx.rule?.name || (tx.type === 'REVERSAL' ? 'Audit Reversal' : 'Manual Entry')}
                </span>

                {canReverse && !isReversal && !isAlreadyReversed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTxForReversal(tx)}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reverse
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP RICH TABLE VIEW (Visible on md: 768px+) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
        <Table>
          <TableHeader>
            <TableRow>
              {showUser && <TableHead>Member</TableHead>}
              <TableHead>Points</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reason & Context</TableHead>
              <TableHead>Rule / Event</TableHead>
              <TableHead>Date & Time</TableHead>
              {canReverse && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const isAlreadyReversed = reversedTxIds.has(tx.id);
              const isReversal = tx.type === 'REVERSAL';

              return (
                <TableRow key={tx.id} className="hover:bg-secondary/40 transition-colors">
                  {showUser && (
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={tx.user?.avatar_url}
                          fallback={tx.user?.full_name || tx.user?.email || 'User'}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {tx.user?.full_name || tx.user?.email?.split('@')[0] || 'Member'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{tx.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-black text-sm ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.amount === 0
                          ? 'text-muted-foreground'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : tx.amount === 0 ? (
                        <span className="h-4 w-4 flex items-center justify-center font-bold">±</span>
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {formatPoints(tx.amount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    {renderTypeBadge(tx.type || 'MANUAL')}
                  </TableCell>

                  <TableCell className="max-w-xs">
                    <p className="text-xs font-medium text-foreground">
                      {tx.reason}
                    </p>
                    {tx.meeting && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Meeting: {tx.meeting.title}
                      </p>
                    )}
                    {tx.reversal_of_id && (
                      <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                        Reverses transaction #{tx.reversal_of_id.slice(0, 8)}
                      </p>
                    )}
                    {isAlreadyReversed && (
                      <span className="inline-block mt-0.5 rounded bg-secondary px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
                        (Reversed in ledger)
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {tx.rule?.name || (tx.type === 'REVERSAL' ? 'Audit Reversal' : 'Manual Entry')}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(tx.created_at)}
                  </TableCell>

                  {canReverse && (
                    <TableCell className="text-right">
                      {!isReversal && !isAlreadyReversed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTxForReversal(tx)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reverse
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedTxForReversal && (
        <ReverseTransactionModal
          isOpen={!!selectedTxForReversal}
          onClose={() => setSelectedTxForReversal(null)}
          transaction={selectedTxForReversal}
          onSuccess={() => {
            setSelectedTxForReversal(null);
            onTransactionUpdated?.();
          }}
        />
      )}
    </>
  );
}
