'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  getPointRules,
  createPointRule,
  updatePointRule,
  togglePointRuleStatus,
} from '@/features/points/services/pointService';
import { formatPoints, formatDate } from '@/lib/utils/formatters';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { isSuperAdmin } from '@/lib/auth/roles';
import { Plus, Check, X, ScrollText, Edit3, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import type { PointRule } from '@/types/database';

const TRIGGER_OPTIONS = [
  { value: 'ATTENDANCE_STATUS', label: 'Meeting Attendance Status' },
  { value: 'TASK_COMPLETION', label: 'Task / Deliverable Completion (Future)' },
  { value: 'PROJECT_CONTRIBUTION', label: 'Project Contribution (Future)' },
  { value: 'EVENT_PARTICIPATION', label: 'Organization Event Participation (Future)' },
  { value: 'MANUAL_MERIT', label: 'Manual Merit Award' },
  { value: 'CUSTOM', label: 'Custom Trigger' },
];

const ATTENDANCE_CONDITIONS = [
  { value: 'PRESENT', label: 'PRESENT (>= 80% duration)' },
  { value: 'LEFT_EARLY', label: 'LEFT_EARLY (departed early / partial duration)' },
  { value: 'ABSENT', label: 'ABSENT (unexcused absence)' },
  { value: 'EXCUSED', label: 'EXCUSED (authorized leave)' },
];

export default function AdminRulesPage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user?.role);
  const [rules, setRules] = React.useState<PointRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<PointRule | null>(null);

  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [triggerType, setTriggerType] = React.useState('ATTENDANCE_STATUS');
  const [conditionValue, setConditionValue] = React.useState('PRESENT');
  const [points, setPoints] = React.useState('5');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadRules = React.useCallback(async () => {
    setIsLoading(true);
    const data = await getPointRules();
    setRules(data);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setName('');
    setDescription('');
    setTriggerType('ATTENDANCE_STATUS');
    setConditionValue('PRESENT');
    setPoints('5');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: PointRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setDescription(rule.description || '');
    setTriggerType(rule.trigger_type);
    setConditionValue(rule.condition_value || '');
    setPoints(rule.points.toString());
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (!superAdmin) return;
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !currentStatus } : r))
    );
    await togglePointRuleStatus(id, !currentStatus);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPoints = parseInt(points, 10);
    if (isNaN(parsedPoints)) {
      setError('Points must be a valid integer.');
      return;
    }

    if (!name.trim()) {
      setError('Rule name is required.');
      return;
    }

    setIsSubmitting(true);

    if (editingRule) {
      const res = await updatePointRule(editingRule.id, {
        name: name.trim(),
        description: description.trim() || null,
        trigger_type: triggerType.trim(),
        condition_value: conditionValue.trim() || null,
        points: parsedPoints,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update rule.');
        setIsSubmitting(false);
        return;
      }
    } else {
      const res = await createPointRule({
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType.trim(),
        condition_value: conditionValue.trim() || undefined,
        points: parsedPoints,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create point rule.');
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    loadRules();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point Evaluation Rules"
        description="Configure automated criteria and merit/penalty formulas for member performance"
        action={
          superAdmin ? (
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Rule
            </Button>
          ) : undefined
        }
      />

      {/* Info notice about historical immutability */}
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground shadow-sm">
        <ShieldAlert className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>
          <strong className="text-foreground">Audit Safety Principle:</strong> Editing or deactivating a rule takes effect for future events only.
          All past transactions recorded in the ledger remain historically preserved.
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No Point Rules"
          description="No evaluation rules have been configured yet. Point rules determine how points are earned or deducted."
          action={
            superAdmin ? (
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                Create First Rule
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
          <div className="md:hidden space-y-3">
            {rules.map((rule) => {
              const isPositive = rule.points > 0;
              return (
                <div
                  key={`mob-rule-${rule.id}`}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-colors text-card-foreground"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground">
                        {rule.name}
                      </p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : rule.points === 0
                            ? 'text-muted-foreground'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPoints(rule.points)} pts
                      </span>
                      {rule.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {rule.trigger_type}
                    </span>
                    {rule.condition_value && (
                      <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {rule.condition_value}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {formatDate(rule.created_at)}
                    </span>

                    {superAdmin && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(rule)}
                          className="h-7 text-xs text-muted-foreground hover:text-emerald-600"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(rule.id, rule.active)}
                          className="h-7 gap-1 text-xs"
                        >
                          {rule.active ? (
                            <>
                              <X className="h-3 w-3 text-rose-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
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
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Trigger Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {superAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const isPositive = rule.points > 0;
                  return (
                    <TableRow key={rule.id} className="hover:bg-secondary/40 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {rule.name}
                          </p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {rule.trigger_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rule.condition_value ? (
                          <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {rule.condition_value}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Default</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : rule.points === 0
                              ? 'text-muted-foreground'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatPoints(rule.points)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rule.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(rule.created_at)}
                      </TableCell>
                      {superAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(rule)}
                              className="h-7 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                              title="Edit rule"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggle(rule.id, rule.active)}
                              className="h-7 gap-1 text-xs"
                            >
                              {rule.active ? (
                                <>
                                  <X className="h-3.5 w-3.5 text-rose-500" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create / Edit Rule Modal (Super Admin only) */}
      {superAdmin && (
        <Dialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRule ? 'Edit Point Rule' : 'Create New Point Rule'}
          description="Configure automation triggers and point formulas"
        >
          <form onSubmit={handleSaveRule} className="space-y-4">
            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            <Input
              label="Rule Name"
              placeholder="e.g. Meeting Attendance - Present"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Trigger Domain"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            {triggerType === 'ATTENDANCE_STATUS' ? (
              <Select
                label="Attendance Condition Match"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
              >
                {ATTENDANCE_CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Condition Key (Optional)"
                placeholder="e.g. COMPLETED, ON_TIME, SPECIAL_EVENT"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
              />
            )}

            <Input
              label="Points Formula (Positive for reward, negative for penalty, 0 for neutral)"
              type="number"
              step="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Rule Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Explain the criteria for this rule..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {editingRule ? 'Update Rule' : 'Save Rule'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
