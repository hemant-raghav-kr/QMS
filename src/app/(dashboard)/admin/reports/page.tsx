'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils/formatters';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Calendar,
  Send,
  Coins,
} from 'lucide-react';
import type { WeeklyReport } from '@/types/database';

export default function AdminReportsPage() {
  const [reports, setReports] = React.useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const fetchReports = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cron/weekly-report');
      // If none yet or success, let's fetch from the API or Supabase client
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('period_end', { ascending: false });

      setReports((data as WeeklyReport[]) || []);
    } catch (err) {
      console.warn('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setStatusMessage(null);
      const res = await fetch('/api/cron/weekly-report?force=true', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(`Successfully generated report: ${data.report?.report_key}`);
        await fetchReports();
      } else {
        setStatusMessage(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Report generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalAuditedPoints = reports.reduce(
    (acc, r) => acc + (r.total_additions || 0) + (r.total_deductions || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Weekly Point Reports"
          description="Automated compliance PDF archives and weekly email dispatch logs"
        />

        <Button
          variant="primary"
          size="sm"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="gap-1.5 self-start sm:self-auto text-xs"
        >
          <Play className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Compiling PDF...' : 'Run Weekly Report Now'}
        </Button>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-border bg-card p-3 text-xs text-foreground shadow-sm">
          {statusMessage}
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Archived Reports</p>
              <h3 className="text-xl font-bold text-foreground">
                {reports.length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Audited Point Volume</p>
              <h3 className="text-xl font-bold text-foreground">
                {totalAuditedPoints} pts
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Delivery Status</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                100% Active
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table & Mobile Cards */}
      {reports.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No Weekly Reports Yet"
          description="Click 'Run Weekly Report Now' to compile the current week's point activity into an archival compliance PDF."
        />
      ) : (
        <>
          {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
          <div className="md:hidden space-y-3">
            {reports.map((report) => (
              <div
                key={`mob-rep-${report.id}`}
                className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 transition-colors text-card-foreground"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground font-mono">
                      {report.report_key}
                    </h4>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {report.period_start.split('T')[0]} to {report.period_end.split('T')[0]}
                    </span>
                  </div>

                  <span
                    className={`font-mono font-bold text-sm ${
                      report.net_change >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {report.net_change >= 0 ? '+' : ''}
                    {report.net_change} pts
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-border text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Txs</span>
                    <span className="font-mono font-semibold text-foreground">{report.total_transactions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Additions</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">+{report.total_additions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Deductions</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">-{report.total_deductions}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[10px] text-muted-foreground truncate">{report.email_recipient}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {report.email_status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Dispatched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={`/api/reports/download?report_key=${encodeURIComponent(report.report_key)}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* 2. DESKTOP RICH TABLE VIEW (Visible on md: 768px+) */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Report Key</th>
                    <th className="px-4 py-3">Audit Period</th>
                    <th className="px-4 py-3 text-right">Transactions</th>
                    <th className="px-4 py-3 text-right">Additions</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Change</th>
                    <th className="px-4 py-3">Recipient & Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {report.report_key}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {report.period_start.split('T')[0]} to {report.period_end.split('T')[0]}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {report.total_transactions}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        +{report.total_additions}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                        -{report.total_deductions}
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono">
                        <span
                          className={
                            report.net_change >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {report.net_change >= 0 ? '+' : ''}
                          {report.net_change}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground truncate max-w-[160px]">
                            {report.email_recipient}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {report.email_status === 'SENT' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Dispatched
                              </span>
                            ) : report.email_status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3 w-3" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/reports/download?report_key=${encodeURIComponent(report.report_key)}`}
                          download
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
