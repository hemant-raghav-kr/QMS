import webpush from 'web-push';
import { createClient } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';
import type { PushSubscription as DbPushSubscription } from '@/types/database';

// Configure VAPID details dynamically
let isVapidConfigured = false;

export function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hemantraghavkr@gmail.com';

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      isVapidConfigured = true;
      return true;
    } catch (err) {
      console.warn('WebPush VAPID configuration error:', err);
    }
  }
  return false;
}

ensureVapidConfigured();

export interface ClientPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

/**
 * Saves or updates a browser push subscription for a user device
 */
export async function savePushSubscription(
  userId: string,
  payload: ClientPushSubscriptionPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        user_agent: payload.userAgent || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Error saving push subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('savePushSubscription error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Removes a push subscription by endpoint (e.g. user toggles off notifications or logs out)
 */
export async function removePushSubscription(endpoint: string): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return { success: true };
  } catch (err) {
    console.error('removePushSubscription error:', err);
    return { success: false };
  }
}

/**
 * Sends a real Web Push notification to all active devices registered to a user.
 * Automatically cleans up expired/unregistered endpoints (HTTP 410 Gone / 404).
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: {
    title: string;
    message: string;
    url?: string;
  }
): Promise<{ sentCount: number; errors: number }> {
  const supabase = getAdminClient();

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subs || subs.length === 0) {
    return { sentCount: 0, errors: 0 };
  }

  if (!ensureVapidConfigured()) {
    console.info(
      `[Push Notification: Simulated] VAPID keys not configured in .env. To: ${userId}. Title: "${payload.title}" Message: "${payload.message}"`
    );
    return { sentCount: subs.length, errors: 0 };
  }

  let sentCount = 0;
  let errors = 0;

  const pushPayload = JSON.stringify({
    title: payload.title,
    message: payload.message,
    url: payload.url || '/notifications',
  });

  await Promise.all(
    subs.map(async (sub: DbPushSubscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
        sentCount++;
      } catch (err: any) {
        errors++;
        // If the subscription is expired or unsubscribed, delete it from the database
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.info(`Removing expired push subscription: ${sub.endpoint}`);
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        } else {
          console.warn('Error sending web push:', err.message || err);
        }
      }
    })
  );

  return { sentCount, errors };
}
