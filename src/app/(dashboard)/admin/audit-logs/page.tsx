'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AuditLogTable } from '@/features/audit/components/AuditLogTable';
import { getAuditLogs, AuditLogWithActor } from '@/features/audit/services/auditService';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLogWithActor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      const data = await getAuditLogs(100);
      setLogs(data);
      setIsLoading(false);
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable system log recording point adjustments, attendance updates, and role modifications"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <AuditLogTable logs={logs} />
      )}
    </div>
  );
}
