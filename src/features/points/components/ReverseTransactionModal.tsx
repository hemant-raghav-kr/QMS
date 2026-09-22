'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { formatPoints, formatDateTime } from '@/lib/utils/formatters';
import { reversePointTransaction, PointTransactionWithDetails } from '../services/pointService';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ReverseTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PointTransactionWithDetails | null;
  onSuccess: () => void;
}

export function ReverseTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: ReverseTransactionModalProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  if (!transaction) return null;

  const reversalAmount = -transaction.amount;
  const isOffsettingDeduction = reversalAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('A mandatory reason is required to perform a transaction reversal.');
      return;
    }

    setIsLoading(true);

    const res = await reversePointTransaction({
      transaction_id: transaction.id,
      reason: reason.trim(),
    });

    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to reverse transaction.');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Reverse Point Transaction"
      description="Create an offsetting reversal transaction in the ledger"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Transaction Summary Card */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 font-medium">Original Transaction:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              #{transaction.id.slice(0, 8)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 block">Member:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {transaction.user?.full_name || transaction.user?.email || 'Member'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Original Amount:</span>
              <span
                className={`font-mono font-bold ${
                  transaction.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatPoints(transaction.amount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Recorded:</span>
              <span>{formatDateTime(transaction.created_at)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Type:</span>
              <span className="font-mono uppercase text-[10px]">{transaction.type}</span>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-slate-400 block">Original Reason:</span>
            <p className="text-slate-800 dark:text-slate-200 italic mt-0.5">
              &ldquo;{transaction.reason}&rdquo;
            </p>
          </div>
        </div>

        {/* Reversal Preview Alert */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Reversal Impact Preview</p>
            <p>
              This operation will insert an immutable{' '}
              <strong className="font-mono">{isOffsettingDeduction ? `+${reversalAmount}` : reversalAmount}</strong>{' '}
              transaction into the ledger referencing transaction #{transaction.id.slice(0, 8)}. The original
              record will remain in the audit history for accountability.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Reversal Reason (Required)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Explain why this transaction is being reversed (e.g. Attendance classification error, duplicate manual entry)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" className="gap-1.5" disabled={isLoading}>
            <RotateCcw className="h-4 w-4" />
            {isLoading ? 'Processing Reversal...' : 'Confirm Reversal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
