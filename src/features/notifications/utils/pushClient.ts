/**
 * Web Push Client Helpers
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerDevicePush(publicKey?: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported on this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Push notification permission was denied.' };
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      return { success: false, error: 'Service worker is not active.' };
    }

    // Default VAPID key if not supplied by env
    let activeKey = publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!activeKey) {
      try {
        const keyRes = await fetch('/api/notifications/push');
        if (keyRes.ok) {
          const data = await keyRes.json();
          activeKey = data.publicKey;
        }
      } catch (err) {
        console.warn('Failed to retrieve public VAPID key dynamically:', err);
      }
    }
    
    // Subscribing options
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    };

    if (activeKey) {
      subscribeOptions.applicationServerKey = urlBase64ToUint8Array(activeKey) as unknown as BufferSource;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions);
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'Invalid subscription object generated.' };
    }

    // Register with server API
    const res = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Failed to register subscription with server.' };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown push error' };
  }
}

export async function unregisterDevicePush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch('/api/notifications/push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to unregister' };
  }
}
