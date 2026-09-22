'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/shared/EmptyState';
import { Megaphone, Calendar, User, Users, Shield, Archive, Edit3 } from 'lucide-react';
import type { AnnouncementWithCreator } from '../services/announcementService';

interface AnnouncementListProps {
  announcements: AnnouncementWithCreator[];
  isAdmin?: boolean;
  onEdit?: (announcement: AnnouncementWithCreator) => void;
}

export function AnnouncementList({ announcements, isAdmin, onEdit }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No Announcements"
        description="There are currently no announcements matching your selected view."
      />
    );
  }

  const renderAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'ADMINS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Shield className="h-3 w-3" />
            Admins Only
          </span>
        );
      case 'MEMBERS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Users className="h-3 w-3" />
            Members Only
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Users className="h-3 w-3" />
            All Community
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {announcements.map((item) => (
        <Card
          key={item.id}
          className={`transition-colors border-border bg-card ${
            item.archived
              ? 'opacity-70 border-dashed bg-muted/30'
              : 'hover:border-emerald-500/40 shadow-sm'
          }`}
        >
          <CardContent className="p-5 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {item.title}
                </h3>
                {renderAudienceBadge(item.target_audience)}
                {item.archived && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(item.created_at)}
                </div>

                {isAdmin && onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {item.content}
            </p>

            {item.creator && (
              <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Posted by {item.creator.full_name || item.creator.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
