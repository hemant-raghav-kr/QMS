import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/types/database';

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data || [];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function updateUserRole(id: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating role:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Updates permitted profile fields for the currently authenticated user.
 * RLS enforces that users can only update their own profile and cannot modify their role.
 */
export async function updateCurrentUserProfile(data: {
  full_name?: string | null;
  avatar_url?: string | null;
}): Promise<{ success: boolean; data?: Profile; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const updatePayload: {
    full_name?: string | null;
    avatar_url?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (data.full_name !== undefined) {
    updatePayload.full_name = data.full_name?.trim() || null;
  }
  if (data.avatar_url !== undefined) {
    updatePayload.avatar_url = data.avatar_url?.trim() || null;
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating user profile:', updateError);
    return { success: false, error: updateError.message };
  }

  // Keep auth metadata in sync with profile full_name
  if (data.full_name !== undefined) {
    await supabase.auth.updateUser({
      data: { full_name: data.full_name?.trim() || null },
    });
  }

  return { success: true, data: updatedProfile };
}
