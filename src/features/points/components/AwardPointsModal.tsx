'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { createPointTransaction } from '../services/pointService';
import type { Profile, PointRule } from '@/types/database';
import { PlusCircle, MinusCircle } from 'lucide-react';

interface AwardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Profile[];
  rules: PointRule[];
  onSuccess: () => void;
  initialUserId?: string;
}

export function AwardPointsModal({
  isOpen,
  onClose,
  members,
  rules,
  onSuccess,
  initialUserId,
}: AwardPointsModalProps) {
  const [selectedUserId, setSelectedUserId] = React.useState(initialUserId || '');
  const [selectedRuleId, setSelectedRuleId] = React.useState('');
  const [actionType, setActionType] = React.useState<'ADD' | 'DEDUCT'>('ADD');
  const [amount, setAmount] = React.useState('10');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const PRESET_AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500];

  React.useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    } else if (members.length > 0 && !selectedUserId) {
      setSelectedUserId(members[0].id);
    }
  }, [members, selectedUserId, initialUserId, isOpen]);

  const handleRuleChange = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      const isPositive = rule.points >= 0;
      setActionType(isPositive ? 'ADD' : 'DEDUCT');
      setAmount(Math.abs(rule.points).toString());
      setReason(rule.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawAmount = parseInt(amount, 10);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      setError('Please enter a valid positive number of points.');
      return;
    }

    const finalAmount = actionType === 'ADD' ? rawAmount : -rawAmount;

    setIsLoading(true);

    const res = await createPointTransaction({
      user_id: selectedUserId,
      amount: finalAmount,
      reason: reason.trim() || undefined,
      type: 'MANUAL',
      rule_id: selectedRuleId || undefined,
    });

    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to record point transaction.');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Award or Deduct Points"
      description="Record a manual merit award or administrative point deduction"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Member Selector */}
        <Select
          label="Select Member"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          required
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || m.email} ({m.email})
            </option>
          ))}
        </Select>

        {/* Predefined Rule Selector */}
        <Select
          label="Apply Predefined Rule (Optional)"
          value={selectedRuleId}
          onChange={(e) => handleRuleChange(e.target.value)}
        >
          <option value="">Custom Manual Transaction</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.points > 0 ? `+${r.points}` : r.points} pts)
            </option>
          ))}
        </Select>

        {/* Action Type Toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Adjustment Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                actionType === 'ADD'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
              onClick={() => setActionType('ADD')}
            >
              <PlusCircle className="h-4 w-4 text-emerald-500" />
              Award Points (+)
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                actionType === 'DEDUCT'
                  ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
              onClick={() => setActionType('DEDUCT')}
            >
              <MinusCircle className="h-4 w-4 text-rose-500" />
              Deduct Points (-)
            </button>
          </div>
        </div>

        {/* Amount with Quick Presets */}
        <div className="space-y-2">
          <Input
            label="Points Amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Quick Amount Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    amount === preset.toString()
                      ? actionType === 'ADD'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'border-rose-500 bg-rose-500/10 text-rose-400 font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {actionType === 'ADD' ? `+${preset}` : `-${preset}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reason (Optional) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Reason (Optional)
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Reason for adjustment (optional — defaults to Administrative point award / deduction)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={actionType === 'ADD' ? 'primary' : 'danger'}
            size="sm"
            disabled={isLoading}
          >
            {isLoading
              ? 'Recording...'
              : actionType === 'ADD'
              ? `Award +${amount} Points`
              : `Deduct -${amount} Points`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
