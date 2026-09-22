'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AnnouncementList } from '@/features/announcements/components/AnnouncementList';
import { CreateAnnouncementModal } from '@/features/announcements/components/CreateAnnouncementModal';
import { EditAnnouncementModal } from '@/features/announcements/components/EditAnnouncementModal';
import {
  getAnnouncements,
  AnnouncementWithCreator,
} from '@/features/announcements/services/announcementService';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { isAdmin } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Plus, Archive } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdminUser = isAdmin(user?.role);
  const [announcements, setAnnouncements] = React.useState<AnnouncementWithCreator[]>([]);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<AnnouncementWithCreator | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadAnnouncements = React.useCallback(async () => {
    setIsLoading(true);
    const data = await getAnnouncements({
      includeArchived: showArchived,
      userRole: user?.role,
    });
    setAnnouncements(data);
    setIsLoading(false);
  }, [showArchived, user?.role]);

  React.useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Official operational notices, policy updates, and company bulletins"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={`text-xs gap-1.5 border-border ${
                showArchived
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </Button>
            {isAdminUser && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-4 w-4" />
                Post Announcement
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <AnnouncementList
          announcements={announcements}
          isAdmin={isAdminUser}
          onEdit={(ann) => setEditingAnnouncement(ann)}
        />
      )}

      {isAdminUser && (
        <>
          <CreateAnnouncementModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSuccess={loadAnnouncements}
          />

          <EditAnnouncementModal
            isOpen={!!editingAnnouncement}
            announcement={editingAnnouncement}
            onClose={() => setEditingAnnouncement(null)}
            onSuccess={loadAnnouncements}
          />
        </>
      )}
    </div>
  );
}
