'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatters';
import {
  Users,
  Video,
  Zap,
  Coins,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileText,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';
import type { AuditLogWithActor } from '@/features/audit/services/auditService';

interface AdminStats {
  totalMembers: number;
  totalMeetings: number;
  totalPointsAwarded: number;
  activeRules: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<AdminStats>({
    totalMembers: 0,
    totalMeetings: 0,
    totalPointsAwarded: 0,
    activeRules: 0,
  });
  const [recentLogs, setRecentLogs] = React.useState<AuditLogWithActor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadOverviewData() {
      try {
        const supabase = createClient();

        const [
          { count: membersCount },
          { count: meetingsCount },
          { data: pointsData },
          { count: rulesCount },
          { data: logsData },
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('meetings').select('id', { count: 'exact', head: true }),
          supabase.from('point_transactions').select('amount').gte('amount', 0),
          supabase.from('point_rules').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase
            .from('audit_logs')
            .select(`
              *,
              actor:profiles!audit_logs_actor_id_fkey(*)
            `)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const totalPoints = (pointsData || []).reduce((acc, row) => acc + (row.amount || 0), 0);

        setStats({
          totalMembers: membersCount || 0,
          totalMeetings: meetingsCount || 0,
          totalPointsAwarded: totalPoints,
          activeRules: rulesCount || 0,
        });

        setRecentLogs((logsData as unknown as AuditLogWithActor[]) || []);
      } catch (err) {
        console.warn('Error loading admin overview:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOverviewData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      link: '/admin/members',
      linkText: 'Manage members',
    },
    {
      title: 'Total Meetings',
      value: stats.totalMeetings,
      icon: Video,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      link: '/admin/meetings',
      linkText: 'View meetings',
    },
    {
      title: 'Points Distributed',
      value: `${stats.totalPointsAwarded} pts`,
      icon: Coins,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      link: '/admin/reports',
      linkText: 'Weekly reports',
    },
    {
      title: 'Active Rules',
      value: stats.activeRules,
      icon: Zap,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      link: '/admin/rules',
      linkText: 'Configure rules',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                  <div className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <Link
                  href={card.link}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  <span>{card.linkText}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operations Quick Actions & Platform Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Operational Fast Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/admin/rules"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-emerald-500/40 hover:bg-secondary/40"
            >
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Point Automation Rules
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Configure triggers for attendance duration, absence deductions, and custom merit bonuses.
                </p>
              </div>
            </Link>

            <Link
              href="/points/transactions"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-emerald-500/40 hover:bg-secondary/40"
            >
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Award / Deduct Points
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Directly add or remove any amount of points for any member whenever you wish.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/attendance"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-emerald-500/40 hover:bg-secondary/40"
            >
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Manual Attendance Override
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Audit join/leave intervals, retroactively adjust status, and auto-sync ledger points.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/reports"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-emerald-500/40 hover:bg-secondary/40"
            >
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Compliance PDF Reports
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generate on-demand weekly audit logs or download archived email dispatch records.
                </p>
              </div>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-emerald-500/40 hover:bg-secondary/40"
            >
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Security & Audit Trails
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Inspect immutable cryptographic logs of all administrative and automated system events.
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* System Engine Health */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              System Services Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Postgres RLS Security</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enforced
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Web Push RFC 8291</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Online
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">PDF jsPDF Engine</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Meeting Reminder Crons</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Armed
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">PWA Service Worker</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                V1 Registered
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Log Preview */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Recent Audit Activities
          </CardTitle>
          <Link
            href="/admin/audit-logs"
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <span>View all audit logs</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No recent audit logs recorded.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground shrink-0 border border-border">
                      {log.action}
                    </span>
                    <span className="text-foreground truncate">
                      Target: <span className="font-medium text-muted-foreground">{log.target_type}</span> ({log.target_id.slice(0, 8)}...)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-[11px]">
                    <span>{log.actor?.full_name || log.actor?.email || 'System'}</span>
                    <span className="font-mono">{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
