'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Video,
  Coins,
  Megaphone,
  Shield,
  Info,
  Filter,
} from 'lucide-react';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService';
import type { Notification } from '@/types/database';

interface NotificationListProps {
  initialNotifications: Notification[];
  userId: string;
}

type FilterType = 'ALL' | 'UNREAD' | 'MEETING' | 'POINTS' | 'ANNOUNCEMENT';

export function NotificationList({ initialNotifications, userId }: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = React.useState<FilterType>('ALL');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((item) => {
      if (filter === 'UNREAD') return !item.read;
      if (filter === 'ALL') return true;
      return item.type === filter;
    });
  }, [notifications, filter]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setIsUpdating(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsRead(userId);
    setIsUpdating(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  };

  const handleCardClick = (item: Notification) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    if (item.link_url) {
      router.push(item.link_url);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'MEETING':
        return <Video className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'POINTS':
        return <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const filterTabs: { id: FilterType; label: string; count?: number }[] = [
    { id: 'ALL', label: 'All', count: notifications.length },
    { id: 'UNREAD', label: 'Unread', count: unreadCount },
    { id: 'MEETING', label: 'Meetings' },
    { id: 'POINTS', label: 'Points' },
    { id: 'ANNOUNCEMENT', label: 'Announcements' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    filter === tab.id
                      ? 'bg-background/20 text-background'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isUpdating}
            className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0 self-end sm:self-auto"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'UNREAD' ? 'No Unread Notifications' : 'No Notifications'}
          description={
            filter === 'UNREAD'
              ? 'You have caught up with all notifications.'
              : 'There are no notifications matching your current filter.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className={`group relative flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-150 ${
                !item.read
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                  : 'border-border bg-card hover:border-border hover:bg-secondary/30 text-card-foreground'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                    !item.read
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {renderIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(item.created_at)}
                    </span>
                    {item.link_url && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">
                        View details
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                {!item.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMarkAsRead(item.id, e)}
                    className="h-8 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                    title="Mark read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(item.id, e)}
                  className="h-8 text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
