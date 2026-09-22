'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils/formatters';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShieldCheck } from 'lucide-react';
import type { AuditLogWithActor } from '../services/auditService';

interface AuditLogTableProps {
  logs: AuditLogWithActor[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No Audit Logs"
        description="All system mutations (points, attendance changes, role updates) will be automatically recorded here."
      />
    );
  }

  return (
    <>
      {/* 1. MOBILE RESPONSIVE CARDS VIEW (Visible below md: 768px) */}
      <div className="md:hidden space-y-3">
        {logs.map((log) => (
          <div
            key={`mob-audit-${log.id}`}
            className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2.5 transition-colors text-card-foreground"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {log.action}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 pt-1 border-t border-border">
              <Avatar
                src={log.actor?.avatar_url}
                fallback={log.actor?.full_name || log.actor?.email || 'Sys'}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {log.actor?.full_name || log.actor?.email?.split('@')[0] || 'System Automated'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{log.actor?.email || 'automated-engine'}</p>
              </div>
            </div>

            <div className="space-y-1 pt-1 text-xs">
              <div className="text-foreground">
                <span className="font-semibold">{log.target_type}</span>: <span className="font-mono text-muted-foreground">{log.target_id.slice(0, 12)}...</span>
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="rounded bg-secondary/50 p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto break-all">
                  {JSON.stringify(log.metadata, null, 1)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 2. DESKTOP RICH TABLE VIEW (Visible on md: 768px+) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-colors">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details / Metadata</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="hover:bg-secondary/40 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={log.actor?.avatar_url}
                      fallback={log.actor?.full_name || log.actor?.email || 'Sys'}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {log.actor?.full_name || log.actor?.email?.split('@')[0] || 'System Automated'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{log.actor?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-foreground">
                    <span className="font-semibold">{log.target_type}</span>: <span className="font-mono text-muted-foreground">{log.target_id.slice(0, 8)}...</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">
                  {JSON.stringify(log.metadata)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
