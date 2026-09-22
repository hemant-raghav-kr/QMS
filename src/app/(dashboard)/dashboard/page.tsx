'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { isAdmin } from '@/lib/auth/roles';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatDate, formatPoints } from '@/lib/utils/formatters';
import { getMeetings, MeetingWithDetails } from '@/features/meetings/services/meetingService';
import {
  getUserPointsSummary,
  getUserTransactions,
  getAllTransactions,
  PointTransactionWithDetails,
  UserPointsSummary,
} from '@/features/points/services/pointService';
import { getAnnouncements, AnnouncementWithCreator } from '@/features/announcements/services/announcementService';
import { getUserNotifications } from '@/features/notifications/services/notificationService';
import { getProfiles } from '@/features/profiles/services/profileService';
import { getAllAttendance, AttendanceWithDetails } from '@/features/attendance/services/attendanceService';
import {
  Users,
  Calendar,
  Coins,
  Megaphone,
  Bell,
  ArrowRight,
  ShieldCheck,
  Plus,
  Clock,
  Video,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { Notification } from '@/types/database';

export default function DashboardPage() {
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.role);

  const [isLoading, setIsLoading] = React.useState(true);
  const [upcomingMeetings, setUpcomingMeetings] = React.useState<MeetingWithDetails[]>([]);
  const [pointsSummary, setPointsSummary] = React.useState<UserPointsSummary>({
    totalPoints: 0,
    pointsEarned: 0,
    pointsDeducted: 0,
    transactionsCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = React.useState<PointTransactionWithDetails[]>([]);
  const [announcements, setAnnouncements] = React.useState<AnnouncementWithCreator[]>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // Admin stats
  const [totalMembers, setTotalMembers] = React.useState(0);
  const [attendanceOverview, setAttendanceOverview] = React.useState<AttendanceWithDetails[]>([]);
  const [adminPointsIssued, setAdminPointsIssued] = React.useState(0);
  const [adminPointsDeducted, setAdminPointsDeducted] = React.useState(0);

  React.useEffect(() => {
    async function loadData() {
      if (!user) return;
      setIsLoading(true);

      try {
        const [meetingsData, announcementsData, notificationsData] = await Promise.all([
          getMeetings('upcoming'),
          getAnnouncements(),
          getUserNotifications(user.id),
        ]);

        setUpcomingMeetings(meetingsData);
        setAnnouncements(announcementsData);
        setNotifications(notificationsData);

        if (userIsAdmin) {
          const [profilesData, allTxData, allAttendanceData] = await Promise.all([
            getProfiles(),
            getAllTransactions(),
            getAllAttendance(),
          ]);

          setTotalMembers(profilesData.length);
          setAttendanceOverview(allAttendanceData);

          let issued = 0;
          let deducted = 0;
          allTxData.forEach((tx) => {
            if (tx.amount > 0) issued += tx.amount;
            else deducted += Math.abs(tx.amount);
          });
          setAdminPointsIssued(issued);
          setAdminPointsDeducted(deducted);
          setRecentTransactions(allTxData.slice(0, 5));
        } else {
          const [summaryData, userTxData] = await Promise.all([
            getUserPointsSummary(user.id),
            getUserTransactions(user.id),
          ]);
          setPointsSummary(summaryData);
          setRecentTransactions(userTxData.slice(0, 5));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, userIsAdmin]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const nextMeeting = upcomingMeetings[0];
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. HERO WELCOME SECTION */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm transition-colors">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Workspace Portal
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-medium text-muted-foreground">
                {currentDateFormatted}
              </span>
              <RoleBadge role={user?.role} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {getGreeting()},{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {user?.fullName || user?.email?.split('@')[0] || 'Member'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Real-time workspace overview, meeting schedules, attendance records, and active point allocations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {userIsAdmin ? (
              <>
                <Link href="/meetings/create">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs shadow-sm">
                    <Plus className="h-4 w-4" />
                    Schedule Meeting
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="text-xs">
                    Admin Hub
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/meetings">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    My Meetings
                  </Button>
                </Link>
                <Link href="/points">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Coins className="h-3.5 w-3.5" />
                    View Ledger
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. ADMIN STATS BAR (If Admin) */}
      {userIsAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Administrative Governance Overview
            </h2>
            <Link
              href="/admin"
              className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              Control Panel <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Total Members</span>
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {isLoading ? '—' : totalMembers}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Active accounts</p>
              </CardContent>
            </Card>

            <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Upcoming Sessions</span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {isLoading ? '—' : upcomingMeetings.length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">On schedule</p>
              </CardContent>
            </Card>

            <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Points Distributed</span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {isLoading ? '—' : `+${adminPointsIssued}`}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total rewarded</p>
              </CardContent>
            </Card>

            <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Points Deducted</span>
                  <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
                  {isLoading ? '—' : `-${adminPointsDeducted}`}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Penalties / absences</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Points Card */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Your Current Balance
              </span>
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {isLoading ? '—' : pointsSummary.totalPoints}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">pts</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : `${pointsSummary.transactionsCount} logged transactions`}
            </p>
            <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
              <Link
                href="/points"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                View Point History <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Alerts & Notices
              </span>
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                <Bell className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {isLoading ? '—' : unreadNotifCount}
              </span>
              <span className="text-xs font-bold text-muted-foreground">unread</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : `${notifications.length} total messages in inbox`}
            </p>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <Link
                href="/notifications"
                className="text-xs font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                Notification Center <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Announcements Card */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Announcements
              </span>
              <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
                <Megaphone className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {isLoading ? '—' : announcements.length}
              </span>
              <span className="text-xs font-bold text-muted-foreground">bulletins</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Official company updates & notices
            </p>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <Link
                href="/announcements"
                className="text-xs font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                Read Announcements <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. UPCOMING MEETINGS SPOTLIGHT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Next Scheduled Meeting
          </h2>
          <Link
            href="/meetings"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            All Meetings ({upcomingMeetings.length}) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {nextMeeting ? (
          <Card className="border-border hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={nextMeeting.status} />
                    <StatusBadge status={nextMeeting.meeting_type} />
                    <span className="text-xs text-muted-foreground">
                      {nextMeeting.duration_minutes} minutes
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground truncate">
                    {nextMeeting.title}
                  </h3>

                  {nextMeeting.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl">
                      {nextMeeting.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {formatDateTime(nextMeeting.scheduled_at)}
                    </span>
                    {nextMeeting.creator && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Host: {nextMeeting.creator.full_name || nextMeeting.creator.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <Link
                    href={
                      nextMeeting.meeting_type === 'INTERNAL'
                        ? `/meetings/${nextMeeting.id}/room`
                        : nextMeeting.external_meeting_url || `/meetings/${nextMeeting.id}`
                    }
                    target={nextMeeting.meeting_type === 'EXTERNAL' ? '_blank' : undefined}
                  >
                    <Button variant="primary" size="md" className="gap-2 font-bold shadow-sm">
                      <Video className="h-4 w-4" />
                      {nextMeeting.status === 'LIVE' ? 'Join Live Now' : 'Enter Meeting Room'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No Upcoming Meetings"
            description="You do not have any sessions scheduled on your calendar at the moment."
            action={
              userIsAdmin ? (
                <Link href="/meetings/create">
                  <Button variant="outline" size="sm">Schedule First Meeting</Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </div>

      {/* 5. RECENT ACTIVITY: TWO COLUMN SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Point Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Recent Point Events
            </h2>
            <Link
              href="/points/transactions"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              Full Ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No point transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentTransactions.map((tx) => {
                    const isPositive = tx.amount >= 0;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold text-xs ${
                                isPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {formatPoints(tx.amount)} pts
                            </span>
                            <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground uppercase">
                              {tx.type}
                            </span>
                          </div>
                          <p className="text-xs text-foreground truncate mt-0.5">
                            {tx.reason || 'Activity recorded'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDateTime(tx.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Announcements Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-500" />
              Latest Bulletins
            </h2>
            <Link
              href="/announcements"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              All Bulletins <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {announcements.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No bulletins posted yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {announcements.slice(0, 4).map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 hover:bg-secondary/40 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {ann.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(ann.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
