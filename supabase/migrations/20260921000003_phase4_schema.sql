-- ==========================================================
-- Quartzite Management System (QMS) - Phase 4: Notifications, Administration, PWA & Weekly Point Backup
-- Migration: 20260921000003_phase4_schema.sql
-- ==========================================================

-- 1. PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
  ON public.push_subscriptions(user_id);

-- 2. MEETING REMINDERS (Idempotency tracking)
CREATE TABLE IF NOT EXISTS public.meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30_MIN', '10_MIN', 'START')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_meeting_reminder UNIQUE (meeting_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_meeting_reminders_meeting_id 
  ON public.meeting_reminders(meeting_id);

-- 3. WEEKLY COMPLIANCE REPORTS ARCHIVE TABLE
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key TEXT NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_additions INTEGER NOT NULL DEFAULT 0,
  total_deductions INTEGER NOT NULL DEFAULT 0,
  net_change INTEGER NOT NULL DEFAULT 0,
  email_recipient TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (email_status IN ('SENT', 'FAILED', 'PENDING')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_at 
  ON public.weekly_reports(created_at DESC);

-- 4. EXTEND NOTIFICATIONS WITH DEEP LINKING
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- 5. EXTEND ANNOUNCEMENTS WITH AUDIENCE TARGETING AND ARCHIVING
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_announcement_target_audience'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT check_announcement_target_audience
      CHECK (target_audience IN ('ALL', 'MEMBERS', 'ADMINS'));
  END IF;
END $$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Push Subscriptions RLS
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Meeting Reminders RLS
CREATE POLICY "Admins can view and manage meeting reminders"
  ON public.meeting_reminders FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Weekly Reports Archive RLS
CREATE POLICY "Admins can view weekly reports"
  ON public.weekly_reports FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage weekly reports"
  ON public.weekly_reports FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
