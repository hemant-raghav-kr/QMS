'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { createAnnouncement } from '../services/announcementService';
import type { AnnouncementAudience } from '@/types/database';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAnnouncementModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [audience, setAudience] = React.useState<AnnouncementAudience>('ALL');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Announcement title is required.');
      return;
    }

    if (!content.trim()) {
      setError('Announcement content is required.');
      return;
    }

    setIsLoading(true);

    const res = await createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      target_audience: audience,
    });

    if (!res.success) {
      setError(res.error || 'Failed to post announcement.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setTitle('');
    setContent('');
    setAudience('ALL');
    onSuccess();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Announcement"
      description="Publish an organizational announcement visible to all members"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Input
          label="Announcement Title"
          placeholder="e.g. Q4 All-Hands Meeting & Quarterly Goals"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Audience
          </label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Community (Everyone)</option>
            <option value="MEMBERS">Members Only</option>
            <option value="ADMINS">Admins Only</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Content
          </label>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Write announcement details here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Publish Announcement
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
