'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { isAdmin } from '@/lib/auth/roles';
import {
  LayoutDashboard,
  Calendar,
  Coins,
  Menu,
  X,
  Megaphone,
  Bell,
  Users,
  ScrollText,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  Layers,
  LogOut,
  FileText,
  Video,
} from 'lucide-react';
import { RoleBadge } from '../shared/RoleBadge';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export function MobileNavigation() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const userIsAdmin = isAdmin(user?.role);

  // Close drawer on route navigation
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const bottomNavItems = [
    { title: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Meetings', href: '/meetings', icon: Calendar },
    { title: 'Points', href: '/points', icon: Coins },
    { title: 'Announce', href: '/announcements', icon: Megaphone },
  ];

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur transition-colors">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">
            QMS
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />

          <Link
            href="/notifications"
            aria-label="View notifications"
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Slide-over Drawer for full navigation */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-card text-card-foreground p-6 shadow-2xl flex flex-col justify-between border-l border-border animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-foreground">Quartzite</h2>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Profile summary in drawer */}
              <div className="py-4 border-b border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.fullName || user?.email?.split('@')[0] || 'Member'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <RoleBadge role={user?.role} />
              </div>

              {/* Drawer Links */}
              <nav className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Workspace
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Dashboard
                </Link>
                <Link
                  href="/meetings"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Meetings
                </Link>
                <Link
                  href="/points"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Points & Ledger
                </Link>
                <Link
                  href="/announcements"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Megaphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Announcements
                </Link>
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Notifications
                </Link>

                {userIsAdmin && (
                  <div className="pt-4 mt-4 border-t border-border space-y-1">
                    <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Admin Hub
                    </span>
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4 text-amber-500" />
                      Hub Overview
                    </Link>
                    <Link
                      href="/admin/members"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Users className="h-4 w-4 text-amber-500" />
                      Members
                    </Link>
                    <Link
                      href="/admin/meetings"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Video className="h-4 w-4 text-amber-500" />
                      Meetings
                    </Link>
                    <Link
                      href="/admin/rules"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <ScrollText className="h-4 w-4 text-amber-500" />
                      Point Rules
                    </Link>
                    <Link
                      href="/admin/attendance"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <ClipboardCheck className="h-4 w-4 text-amber-500" />
                      Attendance
                    </Link>
                    <Link
                      href="/admin/reports"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <FileText className="h-4 w-4 text-amber-500" />
                      Weekly Reports
                    </Link>
                    <Link
                      href="/admin/audit-logs"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      Audit Logs
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4 text-amber-500" />
                      Settings
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            {/* Logout and theme selector in footer */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs text-muted-foreground font-medium">Appearance</span>
                <ThemeSwitcher showLabel={true} variant="dropdown" />
              </div>
              <button
                onClick={() => signOut()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur pb-[env(safe-area-inset-bottom)] transition-colors shadow-lg">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium transition-colors relative',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
              {isActive && (
                <span className="absolute -top-1 h-0.5 w-6 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
