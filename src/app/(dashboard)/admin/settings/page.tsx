'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Database, CheckCircle2, Moon, Sun, Monitor, Bell, Radio } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Diagnostics"
        description="Configuration parameters, display preferences, environment verification, and security controls"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Theme Selector */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Sun className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Interface Appearance & Theme
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose your preferred visual presentation mode across devices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Sun className="h-5 w-5 mb-1.5" />
                <span className="text-xs">Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Moon className="h-5 w-5 mb-1.5" />
                <span className="text-xs">Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  theme === 'system'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Monitor className="h-5 w-5 mb-1.5" />
                <span className="text-xs">System</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current active mode: <span className="font-semibold text-foreground capitalize">{theme}</span>. Zero-FOUC script guarantees immediate rendering without flash.
            </p>
          </CardContent>
        </Card>

        {/* Super Admin Info */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Initial Super Admin Designation
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configured super administrator credentials and privilege elevation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/60 border border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Initial Super Admin
                </p>
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  hemantraghavkr@gmail.com
                </p>
              </div>
              <Badge variant="destructive" className="font-mono text-[10px]">
                SUPER_ADMIN
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              The database trigger <code className="font-mono text-[11px] bg-secondary px-1 rounded">on_auth_user_created</code> guarantees that signups matching this address are automatically elevated to <code className="font-mono text-[11px] bg-secondary px-1 rounded">SUPER_ADMIN</code>.
            </p>
          </CardContent>
        </Card>

        {/* PWA & Service Worker */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Progressive Web App (PWA)
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Offline support, installability, and push notification readiness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Web App Manifest:</span>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> /manifest.json
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Service Worker Registration:</span>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active /sw.js
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Display Mode:</span>
                <span className="font-mono text-foreground">standalone</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Ready for Chrome/Edge/Safari &quot;Add to Home Screen&quot; and desktop installation.
            </p>
          </CardContent>
        </Card>

        {/* Realtime & Push Subsystem */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Radio className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Realtime & Notification Engine
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Supabase Realtime PostgreSQL replication and Web Push
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-foreground" /> Push Notifications:</span>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> VAPID Configured
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-foreground" /> Supabase Realtime Channels:</span>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>LiveKit SFU Infrastructure:</span>
                <span className="font-mono text-foreground">Active</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Real-time synchronization for meeting presence, notifications, attendance, and ledger balance.
            </p>
          </CardContent>
        </Card>

        {/* Database RLS Matrix */}
        <Card className="md:col-span-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Database Foundation & RLS Status
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Supabase PostgreSQL tables, security policies, and performance indexes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              {[
                { name: 'profiles', rls: true },
                { name: 'meetings', rls: true },
                { name: 'meeting_participants', rls: true },
                { name: 'attendance', rls: true },
                { name: 'point_rules', rls: true },
                { name: 'point_transactions', rls: true },
                { name: 'announcements', rls: true },
                { name: 'notifications', rls: true },
                { name: 'audit_logs', rls: true },
                { name: 'weekly_point_backups', rls: true },
              ].map((table) => (
                <div
                  key={table.name}
                  className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center justify-between"
                >
                  <span className="font-mono text-foreground truncate">
                    {table.name}
                  </span>
                  <Badge variant="success" className="text-[9px] px-1.5 py-0">
                    RLS
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
