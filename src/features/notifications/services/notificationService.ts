import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types/database';

export async function getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }

  return count || 0;
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteNotification(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Inserts an in-app notification and dispatches a Web Push alert to the user's active devices
 */
export async function createNotification(params: {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  link_url?: string | null;
}): Promise<{ success: boolean; data?: Notification; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link_url: params.link_url || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    // Trigger Web Push notification in the background via API route
    if (typeof window !== 'undefined') {
      fetch('/api/notifications/dispatch-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: params.user_id,
          title: params.title,
          message: params.message,
          url: params.link_url || '/notifications',
        }),
      }).catch((pushErr) => {
        console.warn('Push dispatch error:', pushErr);
      });
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error('Error in createNotification:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send notification' };
  }
}

/**
 * Server/Admin level notification creation (bypasses RLS using service role key)
 */
export async function createAdminNotification(params: {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  link_url?: string | null;
}): Promise<{ success: boolean; data?: Notification; error?: string }> {
  try {
    const { getAdminClient } = await import('@/lib/supabase/admin');
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link_url: params.link_url || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as Notification };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send admin notification' };
  }
}

