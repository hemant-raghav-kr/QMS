'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import {
  updateAnnouncement,
  deleteAnnouncement,
  AnnouncementWithCreator,
} from '../services/announcementService';
import type { AnnouncementAudience } from '@/types/database';
import { Trash2 } from 'lucide-react';

interface EditAnnouncementModalProps {
  isOpen: boolean;
  announcement: AnnouncementWithCreator | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAnnouncementModal({
  isOpen,
  announcement,
  onClose,
  onSuccess,
}: EditAnnouncementModalProps) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [audience, setAudience] = React.useState<AnnouncementAudience>('ALL');
  const [archived, setArchived] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setContent(announcement.content);
      setAudience(announcement.target_audience || 'ALL');
      setArchived(announcement.archived || false);
      setError(null);
    }
  }, [announcement]);

  if (!announcement) return null;

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

    const res = await updateAnnouncement(announcement.id, {
      title: title.trim(),
      content: content.trim(),
      target_audience: audience,
      archived,
    });

    if (!res.success) {
      setError(res.error || 'Failed to update announcement.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onSuccess();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this announcement?')) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteAnnouncement(announcement.id);
    if (!res.success) {
      setError(res.error || 'Failed to delete announcement.');
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Announcement"
      description="Modify announcement details, target audience, or archive state"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Input
          label="Announcement Title"
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="edit-archived"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="edit-archived" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Archive this announcement (hide from default feed)
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isDeleting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
