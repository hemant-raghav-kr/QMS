'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { PushNotificationToggle } from '@/features/notifications/components/PushNotificationToggle';
import { getUserNotifications } from '@/features/notifications/services/notificationService';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { Notification } from '@/types/database';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserNotifications(user.id);
      setNotifications(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Notification Center"
          description="Manage alerts, upcoming meeting reminders, announcements, and point adjustment notices"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="gap-1.5 self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Browser Push Registration Banner */}
      <PushNotificationToggle />

      {/* Main Notification List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <NotificationList
          key={notifications.length}
          initialNotifications={notifications}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
