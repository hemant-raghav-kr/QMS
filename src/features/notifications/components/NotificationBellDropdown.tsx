'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Video, Coins, Megaphone, Shield, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { formatDateTime } from '@/lib/utils/formatters';
import type { Notification } from '@/types/database';

export function NotificationBellDropdown() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([
        getUserNotifications(user.id, 8),
        getUnreadNotificationsCount(user.id),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  }, [user]);

  React.useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for live notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead(user.id);
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    } else {
      router.push('/notifications');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'MEETING':
        return <Video className="h-4 w-4 text-emerald-500" />;
      case 'POINTS':
        return <Coins className="h-4 w-4 text-amber-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card p-0 shadow-xl z-40 overflow-hidden text-card-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  You have no notifications right now.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 text-left transition-colors cursor-pointer hover:bg-secondary/40 ${
                      !notif.read ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-secondary text-muted-foreground shrink-0">
                      {renderIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            !notif.read
                              ? 'font-bold text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 block font-mono">
                        {formatDateTime(notif.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-border bg-secondary/40 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors"
              >
                View all notifications <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
