import { createClient } from '@/lib/supabase/client';
import { createAdminNotification } from '@/features/notifications/services/notificationService';
import type { Announcement, AnnouncementAudience, Profile, UserRole } from '@/types/database';

export interface AnnouncementWithCreator extends Announcement {
  creator?: Profile | null;
}

export interface GetAnnouncementsOptions {
  includeArchived?: boolean;
  userRole?: UserRole | null;
}

export async function getAnnouncements(options: GetAnnouncementsOptions = {}): Promise<AnnouncementWithCreator[]> {
  const supabase = createClient();
  let query = supabase
    .from('announcements')
    .select(`
      *,
      creator:profiles!announcements_created_by_fkey(*)
    `)
    .order('created_at', { ascending: false });

  if (!options.includeArchived) {
    query = query.eq('archived', false);
  }

  // Audience filtering: If user is regular member, exclude ADMINS-only announcements
  if (options.userRole === 'MEMBER') {
    query = query.in('target_audience', ['ALL', 'MEMBERS']);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }

  return (data as unknown as AnnouncementWithCreator[]) || [];
}

export async function createAnnouncement(params: {
  title: string;
  content: string;
  target_audience?: AnnouncementAudience;
}): Promise<{ success: boolean; data?: Announcement; error?: string }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const targetAudience = params.target_audience || 'ALL';

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title: params.title,
        content: params.content,
        target_audience: targetAudience,
        archived: false,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error || !announcement) {
      return { success: false, error: error?.message || 'Failed to publish announcement.' };
    }

    // Auto-broadcast notifications to target audience in the background
    try {
      let profilesQuery = supabase.from('profiles').select('id, role');

      if (targetAudience === 'ADMINS') {
        profilesQuery = profilesQuery.in('role', ['ADMIN', 'SUPER_ADMIN']);
      } else if (targetAudience === 'MEMBERS') {
        profilesQuery = profilesQuery.eq('role', 'MEMBER');
      }

      const { data: profiles } = await profilesQuery;

      if (profiles && profiles.length > 0) {
        const snippet =
          params.content.length > 120
            ? `${params.content.slice(0, 117)}...`
            : params.content;

        // Dispatch notifications
        for (const profile of profiles) {
          createAdminNotification({
            user_id: profile.id,
            title: `Announcement: ${params.title}`,
            message: snippet,
            type: 'ANNOUNCEMENT',
            link_url: '/announcements',
          }).catch((err) => console.warn('Failed to send announcement notification:', err));
        }
      }
    } catch (notifErr) {
      console.warn('Error broadcasting announcement notifications:', notifErr);
    }

    return { success: true, data: announcement as Announcement };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown announcement error',
    };
  }
}

export async function updateAnnouncement(
  id: string,
  params: {
    title?: string;
    content?: string;
    target_audience?: AnnouncementAudience;
    archived?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('announcements')
    .update({
      ...params,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
