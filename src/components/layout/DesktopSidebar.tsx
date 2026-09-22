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
  Clock,
  Coins,
  Receipt,
  Megaphone,
  Bell,
  Users,
  ScrollText,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  Layers,
  FileText,
} from 'lucide-react';

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.role);

  const mainNav = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Meetings',
      icon: Calendar,
      children: [
        { title: 'Upcoming', href: '/meetings', icon: Calendar },
        { title: 'Past Meetings', href: '/meetings?filter=past', icon: Clock },
      ],
    },
    {
      title: 'Points & Ledger',
      icon: Coins,
      children: [
        { title: 'My Points', href: '/points', icon: Coins },
        { title: 'Transactions', href: '/points/transactions', icon: Receipt },
      ],
    },
    {
      title: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
    },
    {
      title: 'Notifications',
      href: '/notifications',
      icon: Bell,
    },
  ];

  const adminNav = [
    { title: 'Hub Overview', href: '/admin', icon: LayoutDashboard },
    { title: 'Members & Roles', href: '/admin/members', icon: Users },
    { title: 'Meetings Control', href: '/admin/meetings', icon: Calendar },
    { title: 'Point Rules', href: '/admin/rules', icon: ScrollText },
    { title: 'Attendance Audit', href: '/admin/attendance', icon: ClipboardCheck },
    { title: 'Reports & PDF', href: '/admin/reports', icon: FileText },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    { title: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-slate-900 text-slate-200 border-r border-slate-800 transition-colors">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-bold text-sm tracking-tight text-white leading-tight">
              Quartzite
            </span>
            <span className="block text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
              Management System
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Workspace
          </span>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              if (item.children) {
                return (
                  <div key={item.title} className="pt-1.5">
                    <span className="px-3 text-[11px] font-medium text-slate-400 block mb-1">
                      {item.title}
                    </span>
                    <div className="space-y-0.5">
                      {item.children.map((subItem) => {
                        const isActive =
                          pathname === subItem.href ||
                          (subItem.href.includes('?') && pathname.startsWith(subItem.href.split('?')[0]));
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-emerald-400'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            )}
                          >
                            <subItem.icon
                              className={cn(
                                'h-4 w-4 transition-colors',
                                isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                              )}
                            />
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin Navigation (Only shown to Admin / Super Admin) */}
        {userIsAdmin && (
          <div className="pt-4 border-t border-slate-800">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Administration
              </span>
              <span className="rounded-full bg-amber-400/10 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-400">
                ADMIN
              </span>
            </div>
            <div className="space-y-0.5">
              {adminNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      isActive
                        ? 'bg-amber-500/15 text-amber-300 font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-amber-400'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
                      )}
                    />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer system mark */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>QMS Platform</span>
        <span className="font-mono text-[10px] text-emerald-500">v1.0.0</span>
      </div>
    </aside>
  );
}
