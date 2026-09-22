import { createClient } from '@/lib/supabase/client';
import type { Profile, MeetingChatMessage } from '@/types/database';

export interface ChatMessageWithSender extends MeetingChatMessage {
  sender?: Profile | null;
}

export async function getMeetingChatMessages(
  meetingId: string
): Promise<ChatMessageWithSender[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('meeting_chat_messages')
    .select(`
      *,
      sender:profiles!meeting_chat_messages_sender_id_fkey(*)
    `)
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }

  return (data as unknown as ChatMessageWithSender[]) || [];
}

export async function sendMeetingChatMessage(
  meetingId: string,
  content: string
): Promise<{ success: boolean; data?: ChatMessageWithSender; error?: string }> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    return { success: false, error: 'Message cannot be empty.' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User must be authenticated.' };
  }

  const { data, error } = await supabase
    .from('meeting_chat_messages')
    .insert({
      meeting_id: meetingId,
      sender_id: user.id,
      content: cleanContent,
    })
    .select(`
      *,
      sender:profiles!meeting_chat_messages_sender_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Error sending chat message:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as unknown as ChatMessageWithSender };
}
