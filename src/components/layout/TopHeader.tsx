'use client';

import * as React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { RoleBadge } from '../shared/RoleBadge';
import { Avatar } from '@/components/ui/avatar';
import { LogOut, Shield, User } from 'lucide-react';
import { NotificationBellDropdown } from '@/features/notifications/components/NotificationBellDropdown';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export function TopHeader() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur transition-colors">
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Theme Switcher Toggle */}
        <ThemeSwitcher />

        {/* Notifications Icon Button & Dropdown */}
        <NotificationBellDropdown />

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Avatar
              src={user?.avatarUrl}
              fallback={user?.fullName || user?.email || 'User'}
              size="sm"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                {user?.fullName || user?.email?.split('@')[0] || 'Member'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {user?.email}
              </span>
            </div>
            <RoleBadge role={user?.role} showIcon={false} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-30">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-2">
                    <RoleBadge role={user?.role} />
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    Edit Profile
                  </Link>
                  <Link
                    href="/points"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    My Point Balance
                  </Link>
                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <Link
                      href="/admin/members"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Admin Control Panel
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
