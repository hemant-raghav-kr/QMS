'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNavigation } from './MobileNavigation';
import { TopHeader } from './TopHeader';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isMeetingRoom = pathname.includes('/meetings/') && pathname.endsWith('/room');

  // Full-screen distraction-free container for active meeting rooms
  if (isMeetingRoom) {
    return <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Desktop Sidebar (fixed) */}
      <DesktopSidebar />

      {/* Mobile Top Navigation */}
      <MobileNavigation />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Desktop Top Header */}
        <div className="hidden lg:block">
          <TopHeader />
        </div>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
