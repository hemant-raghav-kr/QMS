'use client';

import * as React from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPushSupported, registerDevicePush, unregisterDevicePush } from '../utils/pushClient';

export function PushNotificationToggle() {
  const [supported, setSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsSubscribed(!!sub);
          });
        });
      }
    }
  }, []);

  const handleEnablePush = async () => {
    setIsLoading(true);
    setFeedback(null);
    const res = await registerDevicePush();
    if (res.success) {
      setIsSubscribed(true);
      setPermission('granted');
      setFeedback('Web push notifications enabled successfully on this device!');
    } else {
      setFeedback(res.error || 'Failed to enable push notifications.');
    }
    setIsLoading(false);
  };

  const handleDisablePush = async () => {
    setIsLoading(true);
    setFeedback(null);
    const res = await unregisterDevicePush();
    if (res.success) {
      setIsSubscribed(false);
      setFeedback('Push notifications disabled on this device.');
    } else {
      setFeedback(res.error || 'Failed to disable push notifications.');
    }
    setIsLoading(false);
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Browser Push Notifications
              </h4>
              {isSubscribed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive instant alerts for upcoming meetings, point adjustments, and major team announcements even when the tab is closed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSubscribed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisablePush}
              disabled={isLoading}
              className="text-xs gap-1.5 border-border"
            >
              <BellOff className="h-4 w-4" />
              {isLoading ? 'Updating...' : 'Disable on Device'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleEnablePush}
              disabled={isLoading || permission === 'denied'}
              className="text-xs gap-1.5"
            >
              <Bell className="h-4 w-4" />
              {isLoading
                ? 'Requesting...'
                : permission === 'denied'
                ? 'Blocked in Browser'
                : 'Enable Push'}
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="mt-3 flex items-center gap-2 text-xs text-foreground border-t border-border pt-2">
          <AlertCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
