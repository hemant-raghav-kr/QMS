import { getAdminClient } from '@/lib/supabase/admin';
import { createAdminNotification } from '@/features/notifications/services/notificationService';
import type { MeetingReminderType } from '@/types/database';

export interface ReminderProcessResult {
  processedMeetings: number;
  remindersSent: number;
  logs: string[];
}

/**
 * Checks upcoming meetings and sends idempotent 30-min, 10-min, and start reminders
 */
export async function processMeetingReminders(): Promise<ReminderProcessResult> {
  const supabase = getAdminClient();
  const now = new Date();
  const logs: string[] = [];
  let remindersSent = 0;

  // Window: from 15 minutes ago to 45 minutes in the future
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

  const { data: meetings, error: meetingsError } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, duration_minutes, meeting_type, created_by, status')
    .eq('status', 'SCHEDULED')
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd);

  if (meetingsError) {
    logs.push(`Error querying meetings: ${meetingsError.message}`);
    return { processedMeetings: 0, remindersSent: 0, logs };
  }

  if (!meetings || meetings.length === 0) {
    logs.push('No upcoming scheduled meetings in the reminder window.');
    return { processedMeetings: 0, remindersSent: 0, logs };
  }

  logs.push(`Evaluating ${meetings.length} meetings for scheduled reminders...`);

  for (const meeting of meetings) {
    const scheduledTime = new Date(meeting.scheduled_at).getTime();
    const diffMinutes = Math.round((scheduledTime - now.getTime()) / (60 * 1000));

    const reminderCandidates: { type: MeetingReminderType; title: string; message: string }[] = [];

    // 30 Minutes Reminder (20m to 35m before start)
    if (diffMinutes >= 20 && diffMinutes <= 35) {
      reminderCandidates.push({
        type: '30_MIN',
        title: `Meeting Reminder: ${meeting.title}`,
        message: `Your meeting "${meeting.title}" starts in 30 minutes (${new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
      });
    }

    // 10 Minutes Reminder (5m to 15m before start)
    if (diffMinutes >= 5 && diffMinutes <= 15) {
      reminderCandidates.push({
        type: '10_MIN',
        title: `Starting Soon: ${meeting.title}`,
        message: `Your meeting "${meeting.title}" starts in 10 minutes. Prepare your audio and video.`,
      });
    }

    // Start / Now Reminder (-5m to 4m relative to start)
    if (diffMinutes >= -5 && diffMinutes <= 4) {
      reminderCandidates.push({
        type: 'START',
        title: `Meeting In Session: ${meeting.title}`,
        message: `"${meeting.title}" is starting now! Click to enter the room.`,
      });
    }

    for (const candidate of reminderCandidates) {
      // 1. Check idempotency: has this reminder type already been sent for this meeting?
      const { data: existing } = await supabase
        .from('meeting_reminders')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('reminder_type', candidate.type)
        .maybeSingle();

      if (existing) {
        // Already delivered
        continue;
      }

      // 2. Insert into meeting_reminders to guarantee idempotency
      const { error: insertError } = await supabase
        .from('meeting_reminders')
        .insert({
          meeting_id: meeting.id,
          reminder_type: candidate.type,
        });

      if (insertError) {
        logs.push(`Could not lock reminder for meeting ${meeting.id} (${candidate.type}): ${insertError.message}`);
        continue;
      }

      // 3. Resolve recipient user IDs
      const recipientIds = new Set<string>();
      if (meeting.created_by) {
        recipientIds.add(meeting.created_by);
      }

      // Check participants list
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', meeting.id);

      if (participants && participants.length > 0) {
        participants.forEach((p) => recipientIds.add(p.user_id));
      } else {
        // If no explicit participants specified, notify all active profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        profiles?.forEach((p) => recipientIds.add(p.id));
      }

      // 4. Dispatch notification to all recipients
      const linkUrl = `/meetings/${meeting.id}`;
      for (const userId of recipientIds) {
        await createAdminNotification({
          user_id: userId,
          title: candidate.title,
          message: candidate.message,
          type: 'MEETING',
          link_url: linkUrl,
        });
        remindersSent++;
      }

      logs.push(`Sent ${candidate.type} reminder for "${meeting.title}" to ${recipientIds.size} recipient(s).`);
    }
  }

  return {
    processedMeetings: meetings.length,
    remindersSent,
    logs,
  };
}
