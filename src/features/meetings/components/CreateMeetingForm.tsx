'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createMeeting } from '../services/meetingService';
import { MeetingType, Profile } from '@/types/database';
import { FEATURE_FLAGS } from '@/lib/config/features';
import { Video, Globe, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CreateMeetingFormProps {
  availableMembers: Profile[];
}

export function CreateMeetingForm({ availableMembers }: CreateMeetingFormProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('10:00');
  const [durationMinutes, setDurationMinutes] = React.useState('60');
  const [meetingType, setMeetingType] = React.useState<MeetingType>(
    FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS ? 'INTERNAL' : 'EXTERNAL'
  );
  const [externalMeetingUrl, setExternalMeetingUrl] = React.useState('');
  const [selectedParticipants, setSelectedParticipants] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  // Set default date to today
  React.useEffect(() => {
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
  }, []);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }

    if (!date || !time) {
      setError('Date and time are required.');
      return;
    }

    const effectiveMeetingType = FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS ? meetingType : 'EXTERNAL';

    if (effectiveMeetingType === 'EXTERNAL' && !externalMeetingUrl.trim()) {
      setError('A valid Meeting Link (e.g. Google Meet, Zoom, Teams) is required.');
      return;
    }

    setIsLoading(true);

    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      const result = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(durationMinutes, 10) || 60,
        meeting_type: effectiveMeetingType,
        external_meeting_url: externalMeetingUrl.trim() || undefined,
        participant_ids: selectedParticipants,
      });

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to schedule meeting.');
      }

      router.push(`/meetings/${result.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while creating the meeting.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-slate-500">
          <Link href="/meetings">
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule New Meeting</CardTitle>
          <CardDescription>
            {FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS
              ? 'Create an internal Quartzite video session or an external scheduled meeting'
              : 'Schedule an event with an external meeting link (Google Meet, Zoom, Microsoft Teams)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            <Input
              label="Meeting Title"
              placeholder="e.g. Weekly Engineering Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description / Agenda
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Meeting agenda, topics, or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />

              <Select
                label="Duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </Select>
            </div>

            {FEATURE_FLAGS.ENABLE_INTERNAL_MEETINGS ? (
              <>
                {/* Meeting Type Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Meeting Infrastructure
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeetingType('INTERNAL')}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        meetingType === 'INTERNAL'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${meetingType === 'INTERNAL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Quartzite Video Meeting
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Internal WebRTC conference with automated attendance
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingType('EXTERNAL')}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        meetingType === 'EXTERNAL'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${meetingType === 'EXTERNAL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          External Meeting Link
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Third-party meeting (Google Meet, Zoom, Teams)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {meetingType === 'EXTERNAL' && (
                  <Input
                    label="External Meeting URL"
                    type="url"
                    placeholder="https://meet.google.com/xyz-abcd-efg"
                    value={externalMeetingUrl}
                    onChange={(e) => setExternalMeetingUrl(e.target.value)}
                    required
                  />
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <Input
                  label="Meeting Link (Required)"
                  type="url"
                  placeholder="https://meet.google.com/xyz-abcd-efg or https://zoom.us/j/..."
                  value={externalMeetingUrl}
                  onChange={(e) => setExternalMeetingUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide an external meeting link for attendees (Google Meet, Zoom, Microsoft Teams, etc.).
                </p>
              </div>
            )}

            {/* Participants Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Invited Participants ({selectedParticipants.length} selected)</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedParticipants(
                      selectedParticipants.length === availableMembers.length
                        ? []
                        : availableMembers.map((m) => m.id)
                    )
                  }
                  className="text-xs font-medium text-emerald-600 hover:underline capitalize"
                >
                  {selectedParticipants.length === availableMembers.length ? 'Clear all' : 'Select all'}
                </button>
              </label>

              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-white dark:bg-slate-950">
                {availableMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 text-center">
                    No members registered yet.
                  </p>
                ) : (
                  availableMembers.map((member) => {
                    const isSelected = selectedParticipants.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleParticipant(member.id)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium">
                            {member.full_name || member.email}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {member.role}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/meetings')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Schedule Meeting
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
